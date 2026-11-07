import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  deleteR2Object,
  deleteR2ProjectObjects,
  deleteR2ProjectMetadata,
  getR2Project,
  saveR2Project,
} from "@/lib/r2";

const PROJECT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function isValidStorageKey(
  storageKey: unknown,
  projectId: string
): storageKey is string {
  return (
    typeof storageKey === "string" &&
    storageKey.startsWith(`work/${projectId}/`) &&
    storageKey.length > `work/${projectId}/`.length
  );
}

export async function POST(request: Request) {
  const session = await auth();

  if (session?.user?.id !== "admin") {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const {
      projectId,
      type = "project",
      frameId,
      storageKey,
    } = body;

    if (
      typeof projectId !== "string" ||
      !PROJECT_ID_PATTERN.test(projectId)
    ) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    /*
     * DELETE REPLACED THUMBNAIL MEDIA
     *
     * Deletes only the old R2 object.
     * The new thumbnail metadata is saved separately.
     */
    if (type === "thumbnail-asset") {
      if (!isValidStorageKey(storageKey, projectId)) {
        return NextResponse.json(
          { error: "Invalid or missing storage key" },
          { status: 400 }
        );
      }

      await deleteR2Object(storageKey);

      return NextResponse.json({
        success: true,
        deleted: "r2",
      });
    }

    const project = await getR2Project(projectId);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    /*
     * DELETE THUMBNAIL
     *
     * Remove the metadata and delete its R2 object.
     */
    if (type === "thumbnail") {
      const thumbnailStorageKey =
        storageKey ?? project.thumbnail?.storageKey;

      if (
        thumbnailStorageKey !== undefined &&
        !isValidStorageKey(thumbnailStorageKey, projectId)
      ) {
        return NextResponse.json(
          { error: "Invalid storage key" },
          { status: 400 }
        );
      }

      const previousThumbnail = project.thumbnail;

      delete project.thumbnail;

      await saveR2Project(project);

      if (
        isValidStorageKey(thumbnailStorageKey, projectId)
      ) {
        try {
          await deleteR2Object(thumbnailStorageKey);
        } catch (error) {
          console.error("R2 THUMBNAIL DELETE FAILED:", error);

          return NextResponse.json(
            {
              success: true,
              warning:
                "Thumbnail metadata was removed, but its R2 object could not be deleted.",
            },
            { status: 200 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        deleted: previousThumbnail ? "thumbnail" : null,
      });
    }

    /*
     * DELETE FRAME
     *
     * Verify the frame and its storage key before deletion.
     */
    if (type === "frame") {
      if (
        typeof frameId !== "string" ||
        !frameId.trim()
      ) {
        return NextResponse.json(
          { error: "Missing frameId" },
          { status: 400 }
        );
      }

      const existingFrames = Array.isArray(project.frames)
        ? project.frames
        : [];

      const frame = existingFrames.find(
        (item: any) => item.id === frameId
      );

      if (!frame) {
        return NextResponse.json(
          { error: "Frame not found" },
          { status: 404 }
        );
      }

      if (
        storageKey !== undefined &&
        (
          !isValidStorageKey(storageKey, projectId) ||
          storageKey !== frame.storageKey
        )
      ) {
        return NextResponse.json(
          { error: "Invalid frame storage key" },
          { status: 400 }
        );
      }

      // Validate the stored media key before deleting it.
      if (
        frame.storageKey &&
        !isValidStorageKey(frame.storageKey, projectId)
      ) {
        return NextResponse.json(
          { error: "Invalid stored frame key" },
          { status: 400 }
        );
      }

      // Validate the optional poster key.
      if (
        frame.posterStorageKey &&
        !isValidStorageKey(frame.posterStorageKey, projectId)
      ) {
        return NextResponse.json(
          { error: "Invalid stored poster key" },
          { status: 400 }
        );
      }
      let posterDeletionFailed = false;

      // Delete the main media first. Keep frame metadata if this fails.
      if (frame.storageKey) {
        try {
          await deleteR2Object(frame.storageKey);
        } catch (error) {
          console.error("R2 FRAME DELETE FAILED:", error);

          return NextResponse.json(
            { error: "Could not delete frame media from R2" },
            { status: 500 }
          );
        }
      }

      // Delete the optional poster.
      if (frame.posterStorageKey) {
        try {
          await deleteR2Object(frame.posterStorageKey);
        } catch (error) {
          console.error("R2 POSTER DELETE FAILED:", error);
          posterDeletionFailed = true;
        }
      }

      // Remove the frame from project metadata.
      project.frames = existingFrames.filter(
        (item: any) => item.id !== frameId
      );

      await saveR2Project(project);

      return NextResponse.json({
        success: true,
        projectId,
        frameId,
        ...(posterDeletionFailed
          ? {
              warning:
                "Frame removed, but its poster file could not be deleted.",
            }
          : {}),
      });
    }
    /*
     * DELETE PROJECT
     *
     * Remove all R2 media objects first,
     * then remove the project's metadata.
     */
    if (type === "project") {
      const r2Result = await deleteR2ProjectObjects(projectId);

      await deleteR2ProjectMetadata(projectId);

      return NextResponse.json({
        success: true,
        projectId,
        deletedR2Objects: r2Result.deletedCount,
      });
    }

    return NextResponse.json(
      { error: "Invalid deletion type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to delete:", error);

    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }
}