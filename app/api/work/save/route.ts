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
  thumbnail,
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

// SAVE INDEPENDENT PROJECT THUMBNAIL

if (thumbnail === null) {
  delete project.thumbnail;
} else if (
  thumbnail &&
  typeof thumbnail === "object" &&
  typeof thumbnail.src === "string" &&
  thumbnail.src.trim() !== "" &&
  ["image", "video", "gif"].includes(thumbnail.type)
) {
    project.thumbnail = {
    type: thumbnail.type,
    src: thumbnail.src,

    ...(typeof thumbnail.width === "number" &&
    thumbnail.width > 0
      ? { width: thumbnail.width }
      : {}),

    ...(typeof thumbnail.height === "number" &&
    thumbnail.height > 0
      ? { height: thumbnail.height }
      : {}),

    ...(typeof thumbnail.assetId === "string"
      ? { assetId: thumbnail.assetId }
      : {}),

    ...(typeof thumbnail.publicId === "string"
      ? { publicId: thumbnail.publicId }
      : {}),

    ...(typeof thumbnail.resourceType === "string"
      ? { resourceType: thumbnail.resourceType }
      : {}),
  };
}

console.log(
  "FRAMES RECEIVED:",
  frames.map((frame: any) => ({
    id: frame.id,
    title: frame.title,
    type: frame.type,
    src: frame.src,
  }))
);
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

        assetId:
          editedFrame.assetId ??
          existingFrame?.assetId,

        publicId:
          editedFrame.publicId ??
          existingFrame?.publicId,

        resourceType:
          editedFrame.resourceType ??
          existingFrame?.resourceType,

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
