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
  frameUpdates,
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

        // Apply partial updates to existing frames without rebuilding
    // or revalidating their unchanged media metadata.
    else if (Array.isArray(frameUpdates)) {
      const existingFrames = Array.isArray(project.frames)
        ? project.frames
        : [];

      const updatesById = new Map<string, Record<string, unknown>>();

      for (const update of frameUpdates) {
        if (
          !update ||
          typeof update.id !== "string" ||
          !update.id.trim()
        ) {
          throw new Error("Invalid frame update");
        }

        if (updatesById.has(update.id)) {
          throw new Error("Duplicate frame update");
        }

        const existingFrame = existingFrames.find(
          (frame: any) => frame.id === update.id
        );

        if (!existingFrame) {
          throw new Error("Frame not found");
        }

        const patch: Record<string, unknown> = {};

        if (Object.prototype.hasOwnProperty.call(update, "position")) {
          const position = update.position;

          if (
            !position ||
            typeof position.x !== "number" ||
            !Number.isFinite(position.x) ||
            typeof position.y !== "number" ||
            !Number.isFinite(position.y)
          ) {
            throw new Error("Invalid frame position");
          }

          patch.position = {
            x: position.x,
            y: position.y,
          };
        }

        if (
          update.width !== undefined ||
          update.height !== undefined
        ) {
          if (
            typeof update.width !== "number" ||
            !Number.isFinite(update.width) ||
            update.width <= 0 ||
            typeof update.height !== "number" ||
            !Number.isFinite(update.height) ||
            update.height <= 0
          ) {
            throw new Error("Invalid frame dimensions");
          }

          patch.width = update.width;
          patch.height = update.height;
        }

        if (update.zIndex !== undefined) {
          if (
            typeof update.zIndex !== "number" ||
            !Number.isFinite(update.zIndex)
          ) {
            throw new Error("Invalid frame z-index");
          }

          patch.zIndex = update.zIndex;
        }

        updatesById.set(update.id, patch);
      }

      project.frames = existingFrames.map((frame: any) => {
        const patch = updatesById.get(frame.id);

        return patch
          ? { ...frame, ...patch }
          : frame;
      });
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