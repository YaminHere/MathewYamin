import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ project: string }> }
) {
  try {
    const { project } = await params;

    if (!project) {
      return Response.json(
        { error: "Project is required" },
        { status: 400 }
      );
    }

    const assetFolder = `portfolio/work/${project}`;

    const resources: any[] = [];
    let nextCursor: string | undefined;

    do {
      const result =
        await cloudinary.api.resources_by_asset_folder(
          assetFolder,
          {
            max_results: 500,
            direction: "asc",
            ...(nextCursor
              ? { next_cursor: nextCursor }
              : {}),
          }
        );

      resources.push(...result.resources);

      nextCursor = result.next_cursor;
    } while (nextCursor);

    const media = resources.map((resource) => ({
  assetId: resource.asset_id,
  publicId: resource.public_id,
  displayName: resource.display_name,
  resourceType: resource.resource_type,
  format: resource.format,
  width: resource.width,
  height: resource.height,
  url: resource.secure_url,
  createdAt: resource.created_at,
}));

    return Response.json({
      project,
      media,
    });
  } catch (error) {
    console.error(
      "Cloudinary media fetch failed:",
      error
    );

    return Response.json(
      {
  "project": "january",
  "media": []
}
    );
  }
}