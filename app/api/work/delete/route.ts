import { auth } from "@/auth";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
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
      {
        error: "Unauthorized",
      },
      { status: 401 }
    );
  }

  try {
    const body =
      await request.json();

    const {
      projectId,
      type = "project",
      src,
      assetId,
    } = body;

    if (
      typeof projectId !== "string" ||
      !projectId.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Missing projectId",
        },
        { status: 400 }
      );
    }

    /*
     * ----------------------------------------
     * FRAME DELETE
     * ----------------------------------------
     */

    if (type === "frame") {
  const {
    frameId,
    assetId,
  } = body;

  if (
    typeof frameId !== "string" ||
    !frameId.trim()
  ) {
    return NextResponse.json(
      {
        error:
          "Missing frameId",
      },
      { status: 400 }
    );
  }

  if (
    !/^[a-zA-Z0-9_-]+$/.test(
      projectId
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid projectId",
      },
      { status: 400 }
    );
  }

  const projectJsonPath =
    path.join(
      process.cwd(),
      "public",
      "work",
      projectId,
      "project.json"
    );

  let project;

  try {
    const projectJson =
      await fs.readFile(
        projectJsonPath,
        "utf8"
      );

    project =
      JSON.parse(projectJson);
  } catch {
    return NextResponse.json(
      {
        error:
          "Project not found",
      },
      { status: 404 }
    );
  }

  /*
   * Remove the frame from project.json
   * if it exists there.
   *
   * Cloudinary-only frames may not exist
   * in project.json, because the resolver
   * can discover them directly from Cloudinary.
   */
  if (Array.isArray(project.frames)) {
    project.frames =
      project.frames.filter(
        (item: any) =>
          item.id !== frameId
      );

    await fs.writeFile(
      projectJsonPath,
      JSON.stringify(
        project,
        null,
        2
      ) + "\n",
      "utf8"
    );
  }

  /*
   * Delete the actual Cloudinary asset.
   *
   * For Cloudinary-discovered frames,
   * frame.id is the Cloudinary asset_id.
   */
  if (
    typeof assetId === "string" &&
    assetId.trim()
  ) {
    try {
      const deleteResult =
        await cloudinary.api
          .delete_resources_by_asset_ids(
            [assetId],
            {
              invalidate: true,
            }
          );

      console.log(
        "CLOUDINARY FRAME DELETE:",
        {
          projectId,
          frameId,
          assetId,
          deleteResult,
        }
      );
    } catch (error) {
      console.error(
  "CLOUDINARY FRAME DELETE FAILED:",
  error
);

return NextResponse.json(
  {
    error:
      error instanceof Error
        ? error.message
        : String(error),
  },
  { status: 500 }
);
    }
  }

  return NextResponse.json({
    success: true,
    projectId,
    frameId,
    assetId,
  });
}

    /*
     * ----------------------------------------
     * PROJECT DELETE
     * ----------------------------------------
     */

    if (
      !/^[a-zA-Z0-9_-]+$/.test(
        projectId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid projectId",
        },
        { status: 400 }
      );
    }

    const projectPath =
      path.join(
        process.cwd(),
        "public",
        "work",
        projectId
      );

    try {
      await fs.access(
        projectPath
      );
    } catch {
      return NextResponse.json(
        {
          error:
            "Project not found",
        },
        { status: 404 }
      );
    }

    /*
     * Remove the entire local project
     * directory.
     */
    await fs.rm(
      projectPath,
      {
        recursive: true,
        force: true,
      }
    );

    return NextResponse.json({
      success: true,
      projectId,
    });
  } catch (error) {
    console.error(
      "Failed to delete:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete",
      },
      { status: 500 }
    );
  }
}