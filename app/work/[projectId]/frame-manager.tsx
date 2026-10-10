
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

  // Cloudinary asset reference
  publicId?: string;
  resourceType?: string;
  assetId?: string;
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
  const [deletingFrameId, setDeletingFrameId] =
  useState<string | null>(null);
  const [draggedFrameId, setDraggedFrameId] =
  useState<string | null>(null);
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

  assetId: uploadResult.assetId,
  publicId: uploadResult.publicId,
  resourceType: uploadResult.resourceType,
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




async function deleteFrame(frameId: string) {
  const frame = frames.find((item) => item.id === frameId);
  if (!frame) return;

  const confirmed = window.confirm(
    "Delete this frame and its Cloudinary asset? This cannot be undone."
  );

  if (!confirmed) return;

  setDeletingFrameId(frameId);
  setStatus("");

  try {
    // Delete the Cloudinary asset first, if its identifier is available.
    if (frame.assetId) {
      const deleteResponse = await fetch("/api/work/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          type: "frame",
          frameId,
          assetId: frame.assetId,
        }),
      });

      const deleteResult = await deleteResponse.json();

      if (!deleteResponse.ok || !deleteResult.success) {
        throw new Error(
          deleteResult.error || "Failed to delete Cloudinary asset"
        );
      }
    } else {
      // Legacy frames may not have a Cloudinary asset ID.
      // Remove their project reference through the existing save endpoint.
      const updatedFrames = frames.filter(
        (item) => item.id !== frameId
      );

      const response = await fetch("/api/work/save", {
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

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to remove frame");
      }
    }

    setFrames((current) =>
      current.filter((item) => item.id !== frameId)
    );
    setStatus("Frame deleted.");
    router.refresh();
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Failed to delete frame."
    );
  } finally {
    setDeletingFrameId(null);
  }
}



async function saveFrameOrder(updatedFrames: ProjectFrame[]) {
  setStatus("");

  try {
    const response = await fetch("/api/work/save", {
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

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Failed to save frame order");
    }

    setFrames(updatedFrames);
    setStatus("Frame order saved.");
    router.refresh();
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Failed to save frame order."
    );
  }
}

async function moveFrame(index: number, direction: -1 | 1) {
  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= frames.length) return;

  const updatedFrames = [...frames];
  const [movedFrame] = updatedFrames.splice(index, 1);
  updatedFrames.splice(targetIndex, 0, movedFrame);

  await saveFrameOrder(updatedFrames);
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

        
<div className="mt-6 space-y-6">
  {frames.map((frame, index) => (
    
<div
  key={frame.id}
  draggable={!uploading && deletingFrameId === null}
  onDragStart={() => setDraggedFrameId(frame.id)}
  onDragOver={(event) => event.preventDefault()}
  onDrop={async (event) => {
    event.preventDefault();

    if (!draggedFrameId || draggedFrameId === frame.id) return;

    const fromIndex = frames.findIndex(
      (item) => item.id === draggedFrameId
    );
    const toIndex = frames.findIndex(
      (item) => item.id === frame.id
    );

    if (fromIndex < 0 || toIndex < 0) return;

    const updatedFrames = [...frames];
    const [movedFrame] = updatedFrames.splice(fromIndex, 1);
    updatedFrames.splice(toIndex, 0, movedFrame);

    setDraggedFrameId(null);
    await saveFrameOrder(updatedFrames);
  }}
  onDragEnd={() => setDraggedFrameId(null)}
  className={`group relative overflow-hidden rounded-xl border border-black/10 dark:border-white/10 ${
    draggedFrameId === frame.id ? "opacity-50" : ""
  }`}
>

      {/* FRAME HEADER */}
      <div className="flex items-center justify-between gap-4 border-b border-black/5 px-4 py-3 dark:border-white/10">
        <div className="min-w-0">
          <p className="truncate text-sm">
            {frame.title || `Frame ${index + 1}`}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40">
            {frame.type}
          </p>
        </div>

        
<div className="flex shrink-0 items-center gap-3">
  <button
    type="button"
    disabled={
      index === 0 ||
      uploading ||
      deletingFrameId !== null
    }
    onClick={() => moveFrame(index, -1)}
    aria-label={`Move ${frame.title} up`}
    className="text-xs transition-opacity hover:opacity-50 disabled:opacity-20"
  >
    ↑
  </button>

  <button
    type="button"
    disabled={
      index === frames.length - 1 ||
      uploading ||
      deletingFrameId !== null
    }
    onClick={() => moveFrame(index, 1)}
    aria-label={`Move ${frame.title} down`}
    className="text-xs transition-opacity hover:opacity-50 disabled:opacity-20"
  >
    ↓
  </button>

  <button
    type="button"
    disabled={uploading || deletingFrameId !== null}
    onClick={() => deleteFrame(frame.id)}
    className="text-xs text-red-600 transition-opacity hover:opacity-50 disabled:opacity-40"
  >
    {deletingFrameId === frame.id ? "DELETING..." : "DELETE FRAME"}
  </button>
</div>

      </div>

      {/* FRAME PREVIEW */}
      <div className="bg-black/[0.02] p-3 dark:bg-white/[0.02]">
        {frame.type === "video" ? (
          <video
            src={frame.src}
            controls
            muted
            playsInline
            className="mx-auto max-h-[70vh] w-full rounded-lg object-contain"
          />
        ) : frame.type === "pdf" ? (
          <iframe
            src={frame.src}
            title={frame.title}
            className="h-[60vh] w-full rounded-lg"
          />
        ) : (
          <img
            src={frame.src}
            alt={frame.title}
            className="mx-auto max-h-[70vh] w-full rounded-lg object-contain"
          />
        )}
      </div>
    </div>
  ))}
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
