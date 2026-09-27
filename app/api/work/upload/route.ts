import { auth } from "@/auth";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(
  request: Request
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const formData =
      await request.formData();

    const projectId =
      formData.get("projectId");

    const file =
      formData.get("file");

    if (
      typeof projectId !== "string" ||
      !projectId
    ) {
      return NextResponse.json(
        { error: "Missing projectId" },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "File is empty" },
        { status: 400 }
      );
    }

    const projectPath =
      path.join(
        process.cwd(),
        "public",
        "work",
        projectId
      );

    await fs.mkdir(
      projectPath,
      { recursive: true }
    );

    const extension =
      path.extname(file.name);

    const baseName =
      path
        .basename(
          file.name,
          extension
        )
        .replace(
          /[^a-zA-Z0-9-_]/g,
          "-"
        )
        .replace(
          /-+/g,
          "-"
        )
        .replace(
          /^-|-$/g,
          ""
        )
        .toLowerCase();

    const safeBaseName =
      baseName || "frame";

    const fileName =
      `${Date.now()}-${safeBaseName}${extension.toLowerCase()}`;

    const filePath =
      path.join(
        projectPath,
        fileName
      );

    const bytes =
      await file.arrayBuffer();

    await fs.writeFile(
      filePath,
      Buffer.from(bytes)
    );

    const publicUrl =
      `/work/${projectId}/${fileName}`;

    return NextResponse.json({
      success: true,
      fileName,
      publicUrl,
    });
  } catch (error) {
    console.error(
      "Failed to upload frame:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to upload file",
      },
      { status: 500 }
    );
  }
}