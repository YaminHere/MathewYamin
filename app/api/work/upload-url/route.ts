import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  createR2UploadUrl,
  getR2PublicUrl,
} from "@/lib/r2";

export const runtime = "nodejs";

const PROJECT_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .split(/[\\/]/)
    .pop()
    ?.normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

  return cleaned || "upload";
}

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

    const { projectId, fileName, contentType } = body;

    if (
      typeof projectId !== "string" ||
      !PROJECT_ID_PATTERN.test(projectId)
    ) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    if (
      typeof fileName !== "string" ||
      !fileName.trim() ||
      typeof contentType !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing file information" },
        { status: 400 }
      );
    }

    const normalizedContentType = contentType
  .split(";")[0]
  .trim()
  .toLowerCase();

if (!ALLOWED_CONTENT_TYPES.has(normalizedContentType)) {
  return NextResponse.json(
    { error: "Unsupported file type" },
    { status: 400 }
  );
}

    const safeFileName = sanitizeFileName(fileName);

    // Stable project prefix; unique object key for every upload.
    const key = `work/${projectId}/${randomUUID()}/${safeFileName}`;

    const uploadUrl = await createR2UploadUrl(
  key,
  normalizedContentType
);

    const publicUrl = getR2PublicUrl(key);

    return NextResponse.json({
      success: true,
      uploadUrl,
      publicUrl,
      storageKey: key,
      contentType: normalizedContentType,
    });
  } catch (error) {
    console.error("R2 upload URL creation failed:", error);

    return NextResponse.json(
      { error: "Could not prepare the upload" },
      { status: 500 }
    );
  }
}