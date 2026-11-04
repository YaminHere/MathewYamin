import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { createR2Project } from "@/lib/r2";

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

  if (session?.user?.id !== "admin") {
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
      position,
    } = body;

    if (
      typeof projectId !== "string" ||
      !/^[a-zA-Z0-9_-]+$/.test(projectId)
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
        { error: "Project must have classifications" },
        { status: 400 }
      );
    }

    const validClassifications =
      classifications.filter(
        (classification: unknown) =>
          typeof classification === "string" &&
          CLASSIFICATIONS.includes(classification)
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

    const project = {
      id: projectId,
      title: title.trim(),
      year,
      classifications: validClassifications,

      position:
        position &&
        typeof position.x === "number" &&
        typeof position.y === "number"
          ? {
              x: position.x,
              y: position.y,
            }
          : {
              x: 0,
              y: 0,
            },

      scale: 1,
      frames: [],
    };

    await createR2Project(project);

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error: any) {
    if (
      error?.name === "PreconditionFailed" ||
      error?.$metadata?.httpStatusCode === 412
    ) {
      return NextResponse.json(
        {
          error: "A project with this ID already exists",
        },
        { status: 409 }
      );
    }

    console.error("Failed to create project:", error);

    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}