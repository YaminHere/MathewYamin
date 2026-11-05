
const MAX_IMAGE_DIMENSION = 2560;
const WEBP_QUALITY = 0.85;

// Avoid spending time converting images that are already reasonably small.
const MIN_SIZE_TO_OPTIMIZE = 500 * 1024; // 500 KB

const OPTIMIZABLE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function optimizeImage(file: File): Promise<File> {
  if (!OPTIMIZABLE_TYPES.has(file.type)) {
    return file;
  }

  if (file.size <= MIN_SIZE_TO_OPTIMIZE) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();

    image.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(
        new Error("Could not load image for optimization")
      );
    });

    const { naturalWidth, naturalHeight } = image;

    if (!naturalWidth || !naturalHeight) {
      return file;
    }

    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(naturalWidth, naturalHeight)
    );

    const width = Math.round(naturalWidth * scale);
    const height = Math.round(naturalHeight * scale);

    // Avoid conversion when the image is already within our dimensions.
    if (scale === 1 && file.type === "image/webp") {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(image, 0, 0, width, height);

    const optimizedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY);
    });

    if (!optimizedBlob || optimizedBlob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "");

    return new File(
      [optimizedBlob],
      `${baseName}.webp`,
      {
        type: "image/webp",
        lastModified: file.lastModified,
      }
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
