
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const workPath = path.join(
      process.cwd(),
      "public",
      "work"
    );

    const entries = await fs.readdir(workPath, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const projectPath = path.join(
        workPath,
        entry.name,
        "project.json"
      );

      try {
        const contents = await fs.readFile(
          projectPath,
          "utf8"
        );

        const project = JSON.parse(contents);

        if (project.id === id) {
          return NextResponse.json(project);
        }
      } catch {
        // Skip folders without readable project.json files.
      }
    }

    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Failed to load project:", error);

    return NextResponse.json(
      { error: "Failed to load project" },
      { status: 500 }
    );
  }
}
