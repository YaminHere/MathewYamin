
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const workPath = path.join(
      process.cwd(),
      "public",
      "work"
    );

    const entries = await fs.readdir(workPath, {
      withFileTypes: true,
    });

    const projects = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
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

            if (
              typeof project.id !== "string" ||
              !/^[a-zA-Z0-9_-]+$/.test(project.id)
            ) {
              return null;
            }

            return {
              id: project.id,
              folder: entry.name,
            };
          } catch {
            return null;
          }
        })
    );

    const validProjects = projects.filter(
      (
        project
      ): project is {
        id: string;
        folder: string;
      } => project !== null
    );

    const ids = validProjects.map(
      (project) => project.id
    );

    if (new Set(ids).size !== ids.length) {
      throw new Error(
        "Duplicate project IDs found in project.json files"
      );
    }

    return NextResponse.json({
      projects: validProjects.map(
        (project) => project.id
      ),
    });
  } catch (error) {
    console.error(
      "Failed to load project list:",
      error
    );

    return NextResponse.json(
      { error: "Failed to load projects" },
      { status: 500 }
    );
  }
}
