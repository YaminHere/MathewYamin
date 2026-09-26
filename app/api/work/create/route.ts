import { auth } from "@/auth";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

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
      title,
      year,
      classifications,
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

    if (
      typeof title !== "string" ||
      !title.trim()
    ) {
      return NextResponse.json(
        { error: "Missing project title" },
        { status: 400 }
      );
    }

    if (
      typeof year !== "number" ||
      !Number.isInteger(year)
    ) {
      return NextResponse.json(
        { error: "Invalid project year" },
        { status: 400 }
      );
    }

    if (!Array.isArray(classifications)) {
      return NextResponse.json(
        {
          error:
            "Project must have classifications",
        },
        { status: 400 }
      );
    }

    const validClassifications =
      classifications.filter(
        (classification: unknown) =>
          typeof classification === "string" &&
          CLASSIFICATIONS.includes(
            classification
          )
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

    const workPath = path.join(
      process.cwd(),
      "public",
      "work"
    );

    const projectPath = path.join(
      workPath,
      projectId
    );

    const projectJsonPath = path.join(
      projectPath,
      "project.json"
    );

    /*
     * Prevent accidentally overwriting
     * an existing project.
     */
    try {
      await fs.access(projectPath);

      return NextResponse.json(
        {
          error:
            "A project with this ID already exists",
        },
        { status: 409 }
      );
    } catch {
      // Project does not exist.
      // Continue creating it.
    }

    await fs.mkdir(
      projectPath,
      { recursive: true }
    );

    const project = {
      id: projectId,
      title: title.trim(),
      year,
      classifications:
        validClassifications,
      position: {
        x: 0,
        y: 0,
      },
      scale: 1,
      frames: [],
    };

    await fs.writeFile(
      projectJsonPath,
      JSON.stringify(
        project,
        null,
        2
      ) + "\n",
      "utf8"
    );

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error(
      "Failed to create project:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create project",
      },
      { status: 500 }
    );
  }
}