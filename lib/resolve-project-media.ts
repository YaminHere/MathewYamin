type CloudinaryMedia = {
  assetId: string;
  publicId: string;
  displayName?: string;
  resourceType: string;
  format: string;
  width?: number;
  height?: number;
  url: string;
  createdAt: string;
};

type ProjectFrame = {
  id: string;
  title: string;
  type: "image" | "video" | "gif" | "pdf";
  src: string;
  position: {
    x: number;
    y: number;
  };
  width?: number;
  height?: number;
  zIndex?: number;
};

type Project = {
  id: string;
  title: string;
  year: number;
  classifications: string[];
  position: {
    x: number;
    y: number;
  };
  scale?: number;
  frames: ProjectFrame[];
};

const getBaseName = (value: string) => {
  return value
    .split("/")
    .pop()
    ?.replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .trim() ?? "";
};

const getCloudinaryBaseName = (
  media: CloudinaryMedia
) => {
  const name =
    media.displayName ||
    media.publicId;

  return name
    .replace(/\.[^/.]+$/, "")
    .replace(/_[a-z0-9]{5,}$/i, "")
    .toLowerCase()
    .trim();
};

const getFrameType = (
  media: CloudinaryMedia
): ProjectFrame["type"] => {
  if (media.resourceType === "video") {
    return "video";
  }

  if (media.format === "gif") {
    return "gif";
  }

  if (
    media.format === "pdf" ||
    media.resourceType === "raw"
  ) {
    return "pdf";
  }

  return "image";
};

const getNextFramePosition = (
  frames: ProjectFrame[]
) => {
  const padding = 40;
  const gap = 40;

  let x = 0;
  let y = 0;

  for (const frame of frames) {
    const width = frame.width ?? 420;
    const height = frame.height ?? 300;

    x = Math.max(
      x,
      frame.position.x + width
    );

    y = Math.max(
      y,
      frame.position.y + height
    );
  }

  if (frames.length === 0) {
    return {
      x: padding,
      y: padding,
    };
  }

  return {
    x: x + gap,
    y: padding,
  };
};

export const resolveProjectMedia = (
  project: Project,
  media: CloudinaryMedia[]
): Project => {
  const getComparableName = (value: string) => {
    return value
      .replace(/\.[^/.]+$/, "")
      .replace(/_[a-z0-9]{5,}$/i, "")
      .toLowerCase()
      .trim();
  };

  const getRawName = (value: string) => {
    return value
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .trim();
  };

  const resolvedFrames =
    project.frames.map((frame) => {
      const frameRawName =
        getRawName(
          getBaseName(frame.src)
        );

      const frameComparableName =
        getComparableName(
          getBaseName(frame.src)
        );

      const match = media.find(
        (asset) => {
          // If this frame was already created
          // from this exact Cloudinary asset.
          if (
            frame.id ===
            asset.assetId
          ) {
            return true;
          }

          const assetRawName =
            getRawName(
              asset.displayName ||
                asset.publicId
            );

          const assetComparableName =
            getComparableName(
              asset.displayName ||
                asset.publicId
            );

          // Exact filename match.
          if (
            frameRawName ===
            assetRawName
          ) {
            return true;
          }

          // Match original filename to
          // Cloudinary's suffixed public ID.
          return (
            frameComparableName ===
            assetComparableName
          );
        }
      );

      if (!match) {
        return frame;
      }

      return {
        ...frame,
        src: match.url,
      };
    });

  const frames: ProjectFrame[] = [];

  // Keep each existing project frame only once.
  for (const frame of resolvedFrames) {
    const alreadyExists =
      frames.some(
        (existingFrame) =>
          existingFrame.id ===
          frame.id
      );

    if (alreadyExists) {
      continue;
    }

    frames.push(frame);
  }

  // Add Cloudinary assets that are
  // genuinely new to the project.
  for (const asset of media) {
    const assetRawName =
      getRawName(
        asset.displayName ||
          asset.publicId
      );

    const assetComparableName =
      getComparableName(
        asset.displayName ||
          asset.publicId
      );

    const alreadyExists =
      frames.some((frame) => {
        // Exact Cloudinary asset.
        if (
          frame.id ===
          asset.assetId
        ) {
          return true;
        }

        const frameRawName =
          getRawName(
            getBaseName(
              frame.src
            )
          );

        const frameComparableName =
          getComparableName(
            getBaseName(
              frame.src
            )
          );

        // Exact filename.
        if (
          frameRawName ===
          assetRawName
        ) {
          return true;
        }

        // Original filename ↔
        // Cloudinary suffixed filename.
        return (
          frameComparableName ===
          assetComparableName
        );
      });

    if (alreadyExists) {
      continue;
    }

    const position =
      getNextFramePosition(
        frames
      );

    const naturalWidth =
      asset.width ?? 420;

    const naturalHeight =
      asset.height ?? 300;

    const scale = Math.min(
      600 / naturalWidth,
      500 / naturalHeight,
      1
    );

    frames.push({
      id: asset.assetId,
      title:
        asset.displayName ||
        asset.publicId,
      type: getFrameType(asset),
      src: asset.url,
      position,
      width:
        naturalWidth * scale,
      height:
        naturalHeight * scale,
    });
  }

  return {
    ...project,
    frames,
  };
};