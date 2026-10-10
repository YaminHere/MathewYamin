
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ProjectFrame = {
  id: string;
  title: string;
  type: "image" | "video" | "gif" | "pdf";
  src: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
};

type FrameManagerProps = {
  projectId: string;
  initialFrames: ProjectFrame[];
  projectPosition: { x: number; y: number };
};

export function FrameManager({
  projectId,
  initialFrames,
  projectPosition,
}: FrameManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [frames, setFrames] = useState(initialFrames);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleFiles(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!files.length) return;

    setUploading(true);
    setStatus("");

    try {
      const addedFrames: ProjectFrame[] = [];

      for (const file of files) {
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        const isPdf = file.type === "application/pdf";

        if (!isImage && !isVideo && !isPdf) {
          throw new Error(`Unsupported file: ${file.name}`);
        }

        const formData = new FormData();
        formData.append("projectId", projectId);
        formData.append("file", file);

        const uploadResponse = await fetch("/api/work/upload", {
          method: "POST",
          body: formData,
        });

        const uploadResult = await uploadResponse.json();

        if (
          !uploadResponse.ok ||
          typeof uploadResult.publicUrl !== "string"
        ) {
          throw new Error(
            uploadResult.error || `Upload failed: ${file.name}`
          );
        }

        const type: ProjectFrame["type"] = isPdf
          ? "pdf"
          : isVideo
            ? "video"
            : file.type === "image/gif"
              ? "gif"
              : "image";

        addedFrames.push({
          id: crypto.randomUUID(),
          title: file.name.replace(/\.[^/.]+$/, ""),
          type,
          src: uploadResult.publicUrl,
          position: { x: 0, y: 0 },
        });
      }

      const updatedFrames = [...frames, ...addedFrames];

      const saveResponse = await fetch("/api/work/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          projectPosition,
          frames: updatedFrames,
        }),
      });

      const saveResult = await saveResponse.json();

      if (!saveResponse.ok || !saveResult.success) {
        throw new Error(saveResult.error || "Failed to save frames");
      }

      setFrames(updatedFrames);
      setStatus(
        `${addedFrames.length} frame${addedFrames.length === 1 ? "" : "s"} added successfully.`
      );

      router.refresh();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mb-10 border-y border-black/10 py-5 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">Project frames</h2>
          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            {frames.length} frame{frames.length === 1 ? "" : "s"}
          </p>
        </div>

        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="border border-black/15 px-4 py-2 text-xs uppercase tracking-wider transition-opacity hover:opacity-50 disabled:opacity-40 dark:border-white/20"
        >
          {uploading ? "Uploading..." : "+ Add frames"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/pdf"
          multiple
          hidden
          onChange={handleFiles}
        />
      </div>

      {status && (
        <p
          role="status"
          className="mt-3 text-xs text-black/60 dark:text-white/60"
        >
          {status}
        </p>
      )}
    </section>
  );
}
