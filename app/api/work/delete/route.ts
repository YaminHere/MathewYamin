import { auth } from "@/auth";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
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
  src,
} = body;

    if (
      typeof projectId !== "string" ||
      !projectId.trim()
    ) {
      return NextResponse.json(
        { error: "Missing projectId" },
        { status: 400 }
      );
    }

   /*
 * FRAME DELETE
 */
/*
 * FRAME DELETE
 */
if (type === "frame") {
  if (
    typeof src !== "string" ||
    !src
  ) {
    return NextResponse.json(
      {
        error:
          "Missing frame src",
      },
      { status: 400 }
    );
  }

  try {
    const parsedUrl = new URL(
      src,
      "http://localhost"
    );

    const pathname =
      parsedUrl.pathname;

    /*
     * Frame files must live somewhere
     * inside /public/work/
     */
    const workPrefix = "/work/";

    if (
      !pathname.startsWith(
        workPrefix
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid frame path",
        },
        { status: 400 }
      );
    }

    /*
     * Remove "/work/".
     *
     * Example:
     * /work/procan-eats/packaging.jpg
     *
     * becomes:
     * procan-eats/packaging.jpg
     */
    const relativePath =
      pathname.slice(
        workPrefix.length
      );

    const pathParts =
      relativePath.split("/");

    /*
     * Need at least:
     * [project folder, filename]
     */
    if (
      pathParts.length < 2
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid frame path",
        },
        { status: 400 }
      );
    }

    /*
     * Reject empty or traversal segments.
     */
    if (
      pathParts.some(
        (part) =>
          !part ||
          part === "." ||
          part === ".."
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid frame path",
        },
        { status: 400 }
      );
    }

    const frameProjectId =
      pathParts[0];

    const fileName =
      pathParts
        .slice(1)
        .join("/");

    /*
     * Extra protection against
     * filesystem traversal.
     */
    if (
      !frameProjectId ||
      !fileName ||
      fileName.includes("\\") ||
      fileName.includes("..")
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid frame path",
        },
        { status: 400 }
      );
    }

    const filePath =
      path.join(
        process.cwd(),
        "public",
        "work",
        frameProjectId,
        fileName
      );

    /*
     * Final containment check.
     */
    const workRoot =
      path.resolve(
        process.cwd(),
        "public",
        "work"
      );

    const resolvedFilePath =
      path.resolve(filePath);

    if (
      !resolvedFilePath.startsWith(
        workRoot +
          path.sep
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid frame path",
        },
        { status: 400 }
      );
    }

    try {
  await fs.unlink(
    resolvedFilePath
  );
} catch (error: any) {
  if (
    error?.code !== "ENOENT"
  ) {
    throw error;
  }
}

/*
 * Also remove the frame from the
 * project's project.json.
 *
 * The frame may belong to a different
 * project folder than projectId because
 * some older frames use legacy/moved paths.
 */
const projectJsonPath =
  path.join(
    process.cwd(),
    "public",
    "work",
    projectId,
    "project.json"
  );

try {
  const projectJson =
    await fs.readFile(
      projectJsonPath,
      "utf8"
    );

  const project =
    JSON.parse(projectJson);

  if (Array.isArray(project.frames)) {
    project.frames =
      project.frames.filter(
        (frame: any) =>
          frame.src !== src
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
} catch (error: any) {
  if (
    error?.code !== "ENOENT"
  ) {
    throw error;
  }
}

return NextResponse.json({
  success: true,
  projectId,
  src,
});

  } catch (error) {
    console.error(
      "Failed to delete frame:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Invalid frame path",
      },
      { status: 400 }
    );
  }
}


    /*
     * Only allow a simple project ID.
     * This prevents values such as:
     * ../../something
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

    const projectPath = path.join(
      process.cwd(),
      "public",
      "work",
      projectId
    );

    /*
     * Make sure it actually exists.
     */
    try {
      await fs.access(projectPath);
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
     * Remove the entire project directory.
     *
     * This also removes all frame/media files
     * inside the project.
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
      "Failed to delete project:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete project",
      },
      { status: 500 }
    );
  }
}