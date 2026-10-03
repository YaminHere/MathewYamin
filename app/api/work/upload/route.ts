import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME,
  api_key:
    process.env.CLOUDINARY_API_KEY,
  api_secret:
    process.env.CLOUDINARY_API_SECRET,
});

export async function POST(
  request: Request
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const formData =
      await request.formData();

    const projectId =
      formData.get("projectId");

    const file =
      formData.get("file");

    if (
      typeof projectId !== "string" ||
      !projectId
    ) {
      return NextResponse.json(
        {
          error:
            "Missing projectId",
        },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Missing file",
        },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          error:
            "File is empty",
        },
        { status: 400 }
      );
    }

    const bytes =
      Buffer.from(
        await file.arrayBuffer()
      );

    const uploadResult =
      await new Promise<any>(
        (
          resolve,
          reject
        ) => {
          const uploadStream =
            cloudinary.uploader.upload_stream(
              {
                asset_folder:
                  `portfolio/work/${projectId}`,
                resource_type:
                  "auto",
                use_filename: true,
                unique_filename: true,
              },
              (
                error,
                result
              ) => {
                if (error) {
                  reject(error);
                  return;
                }

                resolve(result);
              }
            );

          uploadStream.end(bytes);
        }
      );

    return NextResponse.json({
      success: true,
      assetId:
        uploadResult.asset_id,
      publicId:
        uploadResult.public_id,
      resourceType:
        uploadResult.resource_type,
      format:
        uploadResult.format,
      publicUrl:
        uploadResult.secure_url,
      width:
        uploadResult.width,
      height:
        uploadResult.height,
    });
  } catch (error) {
    console.error(
      "Failed to upload frame to Cloudinary:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to upload file",
      },
      { status: 500 }
    );
  }
}