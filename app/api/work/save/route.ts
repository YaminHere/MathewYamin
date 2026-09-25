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
  projectTitle,
  projectPosition,
  projectScale,
  projectClassifications,
  projectYear,
  frames,
} = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing projectId" },
        { status: 400 }
      );
    }

    const projectPath = path.join(
      process.cwd(),
      "public",
      "work",
      projectId,
      "project.json"
    );

   
    const existingFile =
      await fs.readFile(projectPath, "utf8");

    const project = JSON.parse(existingFile);

    if (typeof projectTitle === "string") {
  project.title = projectTitle;
}
    project.position = projectPosition;

    if (typeof projectScale === "number") {
  project.scale = projectScale;
}

if (Array.isArray(projectClassifications)) {
  const validClassifications =
    projectClassifications.filter(
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

  project.classifications =
    validClassifications;
}

if (
  typeof projectYear === "number" &&
  Number.isInteger(projectYear)
) {
  project.year = projectYear;
}

    project.frames = project.frames.map(
      (frame: any) => {
        const editedFrame = frames?.find(
          (item: any) =>
            item.id === frame.id
        );

        if (!editedFrame) {
          return frame;
        }

        return {
  ...frame,
  title:
    typeof editedFrame.title === "string"
      ? editedFrame.title
      : frame.title,
  position: editedFrame.position,
  ...(editedFrame.width &&
  editedFrame.height
    ? {
        width: editedFrame.width,
        height: editedFrame.height,
      }
    : {}),
};
      }
    );

    await fs.writeFile(
      projectPath,
      JSON.stringify(project, null, 2) + "\n",
      "utf8"
    );

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Failed to save project:", error);

    return NextResponse.json(
      { error: "Failed to save project" },
      { status: 500 }
    );
  }
}
