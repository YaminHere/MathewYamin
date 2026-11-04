import { auth } from "@/auth";
import { NextResponse } from "next/server";
import {
  getR2ObjectInfo,
  getR2PublicUrl,
  getR2Project,
  saveR2Project,
} from "@/lib/r2";

const PROJECT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

const MEDIA_LIMITS: Record<string, number> = {
  image: 15 * 1024 * 1024,
  gif: 20 * 1024 * 1024,
  video: 100 * 1024 * 1024,
  pdf: 20 * 1024 * 1024,
};

class MediaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaValidationError";
  }
}

async function validateR2Media(
  storageKey: unknown,
  projectId: string,
  type: string
) {
  if (
    typeof storageKey !== "string" ||
    !storageKey.startsWith(`work/${projectId}/`) ||
    storageKey.length <= `work/${projectId}/`.length
  ) {
    throw new MediaValidationError("Invalid media storage key");
  }

  const info = await getR2ObjectInfo(storageKey);
  const maxSize = MEDIA_LIMITS[type];

  if (!maxSize) {
    throw new MediaValidationError("Unsupported media type");
  }

  if (info.size <= 0 || info.size > maxSize) {
    throw new MediaValidationError(
      "Media file is empty or exceeds the size limit"
    );
  }

  const validContentType =
    type === "image"
      ? info.contentType.startsWith("image/") &&
        info.contentType !== "image/gif"
      : type === "gif"
      ? info.contentType === "image/gif"
      : type === "video"
      ? info.contentType.startsWith("video/")
      : type === "pdf"
      ? info.contentType === "application/pdf"
      : false;

  if (!validContentType) {
    console.error("R2 MEDIA TYPE MISMATCH:", {
      storageKey,
      expectedType: type,
      actualContentType: info.contentType,
      size: info.size,
    });

    throw new MediaValidationError(
      "Uploaded media type does not match its metadata"
    );
  }

  return {
    src: getR2PublicUrl(storageKey),
    storageKey,
  };
}

const CLASSIFICATIONS = [
  "brand",
  "product",
  "web",
  "campaigns",
  "visual",
  "illustration",
];

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
      projectTitle,
      projectPosition,
      projectScale,
      projectClassifications,
      projectYear,
      thumbnail,
      frames,
    } = body;

    if (
      typeof projectId !== "string" ||
      !PROJECT_ID_PATTERN.test(projectId)
    ) {
      return NextResponse.json(
        { error: "Invalid projectId" },
        { status: 400 }
      );
    }

    const project = await getR2Project(projectId);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const previousTitle = project.title;

    const nextTitle =
      typeof projectTitle === "string" &&
      projectTitle.trim()
        ? projectTitle.trim()
        : previousTitle;

    if (!nextTitle || typeof nextTitle !== "string") {
      return NextResponse.json(
        { error: "Invalid project title" },
        { status: 400 }
      );
    }

    if (Array.isArray(projectClassifications)) {
      const validClassifications =
        projectClassifications.filter(
          (classification: unknown) =>
            typeof classification === "string" &&
            CLASSIFICATIONS.includes(classification)
        );

      if (validClassifications.length === 0) {
        return NextResponse.json(
          {
            error:
              "A project must have at least one classification",
          },
          { status: 400 }
        );
      }

      project.classifications = validClassifications;
    }

    if (
      typeof projectYear === "number" &&
      Number.isInteger(projectYear)
    ) {
      project.year = projectYear;
    }

    if (projectPosition) {
      project.position = projectPosition;
    }

    if (typeof projectScale === "number") {
      project.scale = projectScale;
    }

    // Save verified R2 thumbnail metadata.
    if (thumbnail === null) {
      delete project.thumbnail;
    } else if (thumbnail && typeof thumbnail === "object") {
      const existingKey = project.thumbnail?.storageKey;

      if (
        typeof thumbnail.storageKey !== "string" ||
        !["image", "video", "gif"].includes(thumbnail.type)
      ) {
        return NextResponse.json(
          { error: "Invalid thumbnail media information" },
          { status: 400 }
        );
      }

      const existingType = project.thumbnail?.type;

      const verified =
        thumbnail.storageKey === existingKey &&
        thumbnail.type === existingType
          ? {
              storageKey: existingKey,
              src: getR2PublicUrl(existingKey),
            }
          : await validateR2Media(
              thumbnail.storageKey,
              projectId,
              thumbnail.type
            );

      project.thumbnail = {
        type: thumbnail.type,
        src: verified.src,
        storageKey: verified.storageKey,

        ...(typeof thumbnail.width === "number" &&
        thumbnail.width > 0
          ? { width: thumbnail.width }
          : {}),

        ...(typeof thumbnail.height === "number" &&
        thumbnail.height > 0
          ? { height: thumbnail.height }
          : {}),
      };
    }

    // Save verified R2 frame metadata.
    if (Array.isArray(frames)) {
      const existingFrames = Array.isArray(project.frames)
        ? project.frames
        : [];

      project.frames = await Promise.all(
        frames.map(async (editedFrame: any) => {
          const existingFrame = existingFrames.find(
            (frame: any) => frame.id === editedFrame.id
          );

          const type =
            editedFrame.type ??
            existingFrame?.type ??
            "image";

          const storageKey =
            editedFrame.storageKey ??
            existingFrame?.storageKey;

          if (
            typeof editedFrame.id !== "string" ||
            !editedFrame.id.trim() ||
            !["image", "video", "gif", "pdf"].includes(type)
          ) {
            throw new Error("Invalid frame information");
          }

          if (typeof storageKey !== "string") {
            throw new Error("Frame is missing its R2 storage key");
          }

          const verified =
            storageKey === existingFrame?.storageKey &&
            type === existingFrame?.type
              ? {
                  storageKey,
                  src: getR2PublicUrl(storageKey),
                }
              : await validateR2Media(
                  storageKey,
                  projectId,
                  type
                );

          return {
            id: editedFrame.id,

            title:
              typeof editedFrame.title === "string"
                ? editedFrame.title
                : existingFrame?.title ?? "Untitled",

            type,
            src: verified.src,
            storageKey: verified.storageKey,

            position:
              editedFrame.position ??
              existingFrame?.position ??
              { x: 0, y: 0 },

            ...(typeof editedFrame.width === "number" &&
            typeof editedFrame.height === "number"
              ? {
                  width: editedFrame.width,
                  height: editedFrame.height,
                }
              : typeof existingFrame?.width === "number" &&
                typeof existingFrame?.height === "number"
              ? {
                  width: existingFrame.width,
                  height: existingFrame.height,
                }
              : {}),

            ...(typeof (
              editedFrame.zIndex ??
              existingFrame?.zIndex
            ) === "number"
              ? {
                  zIndex:
                    editedFrame.zIndex ??
                    existingFrame.zIndex,
                }
              : {}),
          };
        })
      );
    }

    // Project ID remains the permanent storage identity.
    project.title = nextTitle;

    await saveR2Project(project);

    return NextResponse.json({
      success: true,
      project,
      folder: nextTitle
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    });
  } catch (error) {
    if (error instanceof MediaValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    console.error("Failed to save project:", error);

    return NextResponse.json(
      { error: "Failed to save project" },
      { status: 500 }
    );
  }
}