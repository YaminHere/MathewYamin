import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      projectId,
      projectPosition,
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

    project.position = projectPosition;

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