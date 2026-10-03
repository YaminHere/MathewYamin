export type CloudinaryMedia = {
  assetId: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  format: string;
  width?: number;
  height?: number;
  url: string;
  createdAt: string;
};

export type CloudinaryProjectMedia = {
  project: string;
  media: CloudinaryMedia[];
};

export async function getCloudinaryProjectMedia(
  projectId: string
): Promise<CloudinaryProjectMedia> {
  const response = await fetch(
    `/api/cloudinary/${encodeURIComponent(projectId)}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Cloudinary media for ${projectId}`
    );
  }

  return response.json();
}