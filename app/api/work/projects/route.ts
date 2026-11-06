import { NextResponse } from "next/server";
import { listR2Projects } from "@/lib/r2";

export async function GET() {
  try {
    const projects = await listR2Projects();

    const ids = projects.map((project) => project.id);

    if (new Set(ids).size !== ids.length) {
      throw new Error("Duplicate project IDs found in R2 metadata");
    }

    return NextResponse.json({
      projects,
    });
  } catch (error) {
    console.error("Failed to load project list:", error);

    return NextResponse.json(
      { error: "Failed to load projects" },
      { status: 500 }
    );
  }
}