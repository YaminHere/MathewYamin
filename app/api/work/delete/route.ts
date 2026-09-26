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