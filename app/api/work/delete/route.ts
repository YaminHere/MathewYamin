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
 * DELETE REPLACED THUMBNAIL ASSET ONLY
 * ----------------------------------------
 */
if (type === "thumbnail-asset") {
  if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    return NextResponse.json(
      { error: "Invalid projectId" },
      { status: 400 }
    );
  }

  if (typeof assetId !== "string" || !assetId.trim()) {
    return NextResponse.json(
      { error: "Missing thumbnail assetId" },
      { status: 400 }
    );
  }

  try {
    const lookup = await cloudinary.api.resources_by_asset_ids([
      assetId,
    ]);

    const asset = lookup.resources?.[0];

    // Already deleted: nothing else to do.
    if (!asset) {
      return NextResponse.json({ success: true });
    }

    if (asset.asset_folder !== `portfolio/work/${projectId}`) {
      return NextResponse.json(
        { error: "Asset does not belong to this project" },
        { status: 403 }
      );
    }

    const result =
      await cloudinary.api.delete_resources_by_asset_ids(
        [assetId],
        { invalidate: true }
      );

    const deleted = (
      result as { deleted?: Record<string, string> }
    ).deleted?.[assetId];

    if (deleted !== "deleted" && deleted !== "not found") {
      return NextResponse.json(
        { error: "Cloudinary asset deletion failed" },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("REPLACED THUMBNAIL DELETE FAILED:", error);

    return NextResponse.json(
      { error: "Failed to delete replaced thumbnail" },
      { status: 500 }
    );
  }
}

    /*
     * ----------------------------------------
     * THUMBNAIL DELETE
     * ----------------------------------------
     */

    if (type === "thumbnail") {
      if (!/^[a-zA-Z0-9_-]+$/.test(projectId)) {
        return NextResponse.json(
          { error: "Invalid projectId" },
          { status: 400 }
        );
      }

      const projectJsonPath = path.join(
        process.cwd(),
        "public",
        "work",
        projectId,
        "project.json"
      );

      let project: any;

      try {
        project = JSON.parse(
          await fs.readFile(projectJsonPath, "utf8")
        );
      } catch {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      const thumbnail = project.thumbnail;

// Use the ID sent by the UI if project.json has
// already lost the thumbnail metadata.
const thumbnailAssetId =
  typeof assetId === "string" && assetId.trim()
    ? assetId
    : thumbnail?.assetId;

if (thumbnailAssetId) {
  try {
    // Look up the asset using its asset ID.
    const lookup = await cloudinary.api.resources_by_asset_ids([
      thumbnailAssetId,
    ]);

    const asset = lookup.resources?.[0];

    if (!asset) {
      return NextResponse.json(
        { error: "Thumbnail asset not found in Cloudinary" },
        { status: 404 }
      );
    }

    // Confirm the asset belongs to this project.
    if (asset.asset_folder !== `portfolio/work/${projectId}`) {
      return NextResponse.json(
        { error: "Thumbnail does not belong to this project" },
        { status: 403 }
      );
    }

    const result =
      await cloudinary.api.delete_resources_by_asset_ids(
        [thumbnailAssetId],
        { invalidate: true }
      );

    const deleted = (
      result as { deleted?: Record<string, string> }
    ).deleted?.[thumbnailAssetId];

    if (deleted !== "deleted" && deleted !== "not found") {
      return NextResponse.json(
        { error: "Cloudinary thumbnail deletion failed" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("THUMBNAIL DELETE FAILED:", error);

    return NextResponse.json(
      { error: "Failed to delete thumbnail from Cloudinary" },
      { status: 500 }
    );
  }
}

delete project.thumbnail;

await fs.writeFile(
  projectJsonPath,
  JSON.stringify(project, null, 2) + "\n",
  "utf8"
);

return NextResponse.json({ success: true });

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

const projectJsonPath =
    path.join(
        projectPath,
        "project.json"
    );

let project: any;

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
 * ----------------------------------------
 * DELETE CLOUDINARY ASSETS
 * ----------------------------------------
 */

const assetIds: string[] = [];

try {
  const assetFolder =
    `portfolio/work/${projectId}`;

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

    for (const resource of result.resources ?? []) {
      if (
        typeof resource.asset_id === "string" &&
        resource.asset_id.trim()
      ) {
        assetIds.push(resource.asset_id);
      }
    }

    nextCursor = result.next_cursor;
  } while (nextCursor);
} catch (error) {
  console.error(
    "CLOUDINARY PROJECT ASSET LIST FAILED:",
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

const uniqueAssetIds = [
  ...new Set(assetIds),
];

if (uniqueAssetIds.length > 0) {
  try {
    const deleteResult =
      await cloudinary.api
        .delete_resources_by_asset_ids(
          uniqueAssetIds,
          { invalidate: true }
        );

    console.log(
      "CLOUDINARY PROJECT DELETE:",
      {
        projectId,
        assetIds: uniqueAssetIds,
        deleteResult,
      }
    );
  } catch (error) {
    console.error(
      "CLOUDINARY PROJECT ASSET DELETE FAILED:",
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

/*
 * ----------------------------------------
 * DELETE EMPTY CLOUDINARY FOLDER
 * ----------------------------------------
 */

try {
    await cloudinary.api.delete_folder(
        `portfolio/work/${projectId}`
    );

    console.log(
        "CLOUDINARY FOLDER DELETED:",
        `portfolio/work/${projectId}`
    );
} catch (error) {
    console.error(
        "CLOUDINARY FOLDER DELETE FAILED:",
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

/*
 * ----------------------------------------
 * REMOVE LOCAL PROJECT
 * ----------------------------------------
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
    deletedCloudinaryAssets:
        uniqueAssetIds.length,
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