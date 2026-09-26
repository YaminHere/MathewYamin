import { auth } from "@/auth";
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

    const entries =
      await fs.readdir(workPath, {
        withFileTypes: true,
      });

    const projectIds = entries
      .filter(
        (entry) =>
          entry.isDirectory()
      )
      .map(
        (entry) =>
          entry.name
      );

    return NextResponse.json({
      projects: projectIds,
    });
  } catch (error) {
    console.error(
      "Failed to load project list:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load projects",
      },
      { status: 500 }
    );
  }
}