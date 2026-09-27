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

console.log(
  "SERVER SAVE POSITION:",
  {
    projectId,
    projectPosition,
  }
);

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

    if (Array.isArray(frames)) {
  project.frames = frames.map(
    (editedFrame: any) => {
      const existingFrame =
        project.frames.find(
          (frame: any) =>
            frame.id === editedFrame.id
        );

      return {
        ...(existingFrame ?? {}),
        id: editedFrame.id,
        title:
          typeof editedFrame.title ===
          "string"
            ? editedFrame.title
            : existingFrame?.title ??
              "Untitled",
        type:
          editedFrame.type ??
          existingFrame?.type ??
          "image",
        src:
          editedFrame.src ??
          existingFrame?.src ??
          "",
        position:
          editedFrame.position ??
          existingFrame?.position ??
          {
            x: 0,
            y: 0,
          },
        ...(editedFrame.width &&
        editedFrame.height
          ? {
              width:
                editedFrame.width,
              height:
                editedFrame.height,
            }
          : existingFrame?.width &&
            existingFrame?.height
          ? {
              width:
                existingFrame.width,
              height:
                existingFrame.height,
            }
          : {}),
      };
    }
  );
}

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
