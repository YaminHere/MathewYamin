
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { optimizeImage } from "@/lib/image-optimizer";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(
  () => import("@/components/ui/pdf-viewer").then((mod) => mod.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-black/40 dark:text-white/40">
        Loading PDF...
      </div>
    ),
  }
);

type ProjectFrame = {
  id: string;
  title: string;
  type: "image" | "video" | "gif" | "pdf";
  src: string;
  storageKey?: string;
  poster?: string;
  posterStorageKey?: string;
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
  const [deletingFrameId, setDeletingFrameId] =
  useState<string | null>(null);
  const [draggedFrameId, setDraggedFrameId] =
  useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [converterToken, setConverterToken] = useState("");
  const [converterConnected, setConverterConnected] = useState(false);

  async function connectConverter(token = converterToken) {
  setConverterConnected(false);
  setStatus("Connecting to local video converter...");

  try {
    const response = await fetch(
      "http://127.0.0.1:4317/api/status",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok || !result.authenticated) {
      throw new Error(
        result.error || "Could not authenticate with the converter."
      );
    }

    localStorage.setItem("local-video-converter-token", token);

    setConverterToken(token);
    setConverterConnected(true);
    setStatus("Local video converter connected.");
  } catch (error) {
    setConverterConnected(false);
    setStatus(
      error instanceof Error
        ? error.message
        : "Could not connect to the local video converter."
    );
  }
}

useEffect(() => {
  const savedToken = localStorage.getItem(
    "local-video-converter-token"
  );

  if (savedToken) {
    setConverterToken(savedToken);
    connectConverter(savedToken);
  }
}, []);

  const [savingOrder, setSavingOrder] = useState(false);
  const [fileDragActive, setFileDragActive] = useState(false);
  const fileDragDepthRef = useRef(0);

  async function convertMp4(file: File) {
  const converterUrl = "http://127.0.0.1:4317";

  if (!converterToken.trim()) {
    throw new Error("Enter your local converter token first.");
  }

  const formData = new FormData();
  formData.append("video", file);

  const conversionResponse = await fetch(
    `${converterUrl}/api/convert`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${converterToken}`,
      },
      body: formData,
    }
  );

  const conversionResult = await conversionResponse.json();

  if (
    !conversionResponse.ok ||
    !conversionResult.ok ||
    typeof conversionResult.video?.url !== "string" ||
    typeof conversionResult.video?.fileName !== "string" ||
    typeof conversionResult.thumbnail?.url !== "string" ||
    typeof conversionResult.thumbnail?.fileName !== "string"
  ) {
    throw new Error(
      conversionResult.error || "MP4 conversion failed."
    );
  }

  const fileUrlPrefix = `${converterUrl}/api/files/`;

  if (
    !conversionResult.video.url.startsWith(fileUrlPrefix) ||
    !conversionResult.thumbnail.url.startsWith(fileUrlPrefix)
  ) {
    throw new Error("The converter returned an invalid file URL.");
  }

  const downloadHeaders = {
    Authorization: `Bearer ${converterToken}`,
  };

  const [videoResponse, thumbnailResponse] = await Promise.all([
    fetch(conversionResult.video.url, {
      headers: downloadHeaders,
    }),
    fetch(conversionResult.thumbnail.url, {
      headers: downloadHeaders,
    }),
  ]);

  if (!videoResponse.ok || !thumbnailResponse.ok) {
    throw new Error("Could not download the converted files.");
  }

  const [videoBlob, thumbnailBlob] = await Promise.all([
    videoResponse.blob(),
    thumbnailResponse.blob(),
  ]);

  if (
    videoBlob.type !== "video/webm" ||
    thumbnailBlob.type !== "image/webp"
  ) {
    throw new Error("The converter returned unexpected file formats.");
  }

  return {
    video: new File(
      [videoBlob],
      conversionResult.video.fileName,
      { type: "video/webm" }
    ),
    thumbnail: new File(
      [thumbnailBlob],
      conversionResult.thumbnail.fileName,
      { type: "image/webp" }
    ),
  };
}


async function uploadToR2(file: File) {
  const uploadResponse = await fetch("/api/work/upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      projectId,
      fileName: file.name,
      contentType: file.type,
    }),
  });

  const uploadResult = await uploadResponse.json();

  if (
    !uploadResponse.ok ||
    typeof uploadResult.uploadUrl !== "string" ||
    typeof uploadResult.publicUrl !== "string" ||
    typeof uploadResult.storageKey !== "string"
  ) {
    throw new Error(
      uploadResult.error || `Could not prepare upload: ${file.name}`
    );
  }

  const directUploadResponse = await fetch(uploadResult.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!directUploadResponse.ok) {
    throw new Error(`R2 upload failed: ${file.name}`);
  }

  return {
    publicUrl: uploadResult.publicUrl as string,
    storageKey: uploadResult.storageKey as string,
  };
}


  async function uploadFiles(files: File[]) {
  if (!files.length) return;

    setUploading(true);
setStatus("");

const addedFrames: ProjectFrame[] = [];
const uploadedStorageKeys: string[] = [];
let saveRequestStarted = false;

try {

      for (const file of files) {
        const isMp4 =
          file.type === "video/mp4" ||
          (!file.type && /\.mp4$/i.test(file.name));

        const isGif = file.type === "image/gif";
        const isImage = file.type.startsWith("image/") && !isGif;
        const isVideo = file.type.startsWith("video/") || isMp4;
        const isPdf = file.type === "application/pdf";

const maxSize = isGif
  ? 20 * 1024 * 1024
  : isImage
  ? 15 * 1024 * 1024
  : isVideo
  ? 100 * 1024 * 1024
  : isPdf
  ? 20 * 1024 * 1024
  : 0;

if (!maxSize) {
  throw new Error(`Unsupported file: ${file.name}`);
}

if (file.size === 0) {
  throw new Error(`The selected file is empty: ${file.name}`);
}

if (file.size > maxSize) {
  throw new Error(
    `${file.name} exceeds the ${maxSize / (1024 * 1024)} MB limit.`
  );
}


if (isMp4) {
  if (!converterConnected || !converterToken.trim()) {
    throw new Error(
      "Connect the local video converter before uploading MP4 files."
    );
  }

  setStatus(`Converting ${file.name} locally...`);

  const converted = await convertMp4(file);

  setStatus(`Uploading converted video: ${file.name}...`);

  const videoUpload = await uploadToR2(converted.video);
  uploadedStorageKeys.push(videoUpload.storageKey);

setStatus(`Uploading thumbnail: ${file.name}...`);

const thumbnailUpload = await uploadToR2(converted.thumbnail);
uploadedStorageKeys.push(thumbnailUpload.storageKey);

  addedFrames.push({
    id: crypto.randomUUID(),
    title: file.name.replace(/\.[^/.]+$/, ""),
    type: "video",
    src: videoUpload.publicUrl,
    storageKey: videoUpload.storageKey,
    poster: thumbnailUpload.publicUrl,
    posterStorageKey: thumbnailUpload.storageKey,
    position: { x: 0, y: 0 },
  });

  continue;
}

const uploadFile = isImage
  ? await optimizeImage(file)
  : file;

console.log("Frame Manager optimization:", {
  originalSize: file.size,
  uploadedSize: uploadFile.size,
  originalType: file.type,
  uploadedType: uploadFile.type,
});

const uploadResult = await uploadToR2(uploadFile);
uploadedStorageKeys.push(uploadResult.storageKey);

const type: ProjectFrame["type"] = isPdf
  ? "pdf"
  : isVideo
    ? "video"
    : isGif
      ? "gif"
      : "image";

addedFrames.push({
  id: crypto.randomUUID(),
  title: file.name.replace(/\.[^/.]+$/, ""),
  type,
  src: uploadResult.publicUrl,
  storageKey: uploadResult.storageKey,
  position: { x: 0, y: 0 },
});
}

      const updatedFrames = [...frames, ...addedFrames];
      saveRequestStarted = true;

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
  if (!saveRequestStarted && uploadedStorageKeys.length > 0) {
    setStatus("Upload failed. Cleaning up uploaded files...");

    for (const storageKey of uploadedStorageKeys) {
      try {
        const cleanupResponse = await fetch("/api/work/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
            type: "thumbnail-asset",
            storageKey,
          }),
        });

        if (!cleanupResponse.ok) {
          console.error(
            "Could not clean up uploaded R2 object:",
            storageKey
          );
        }
      } catch (cleanupError) {
        console.error(
          "R2 cleanup request failed:",
          cleanupError
        );
      }
    }
  }

  setStatus(
    error instanceof Error
      ? error.message
      : "Something went wrong."
  );
} finally {
      setUploading(false);
    }
  }

function handleFiles(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const files = Array.from(event.currentTarget.files ?? []);
  event.currentTarget.value = "";

  void uploadFiles(files);
}

useEffect(() => {
  const hasFiles = (event: DragEvent) =>
    Array.from(event.dataTransfer?.types ?? []).includes("Files");

  const handleDragEnter = (event: DragEvent) => {
    if (!hasFiles(event)) return;

    event.preventDefault();

    if (uploading || savingOrder || deletingFrameId !== null) {
      return;
    }

    fileDragDepthRef.current += 1;
    setFileDragActive(true);
  };

  const handleDragOver = (event: DragEvent) => {
    if (!hasFiles(event)) return;

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragLeave = (event: DragEvent) => {
    if (!hasFiles(event)) return;

    fileDragDepthRef.current -= 1;

    if (fileDragDepthRef.current <= 0) {
      fileDragDepthRef.current = 0;
      setFileDragActive(false);
    }
  };

  const handleDrop = (event: DragEvent) => {
    if (!hasFiles(event)) return;

    event.preventDefault();

    fileDragDepthRef.current = 0;
    setFileDragActive(false);

    if (uploading || savingOrder || deletingFrameId !== null) {
      setStatus("Please wait until the current operation finishes.");
      return;
    }

    const files = Array.from(event.dataTransfer?.files ?? []);

    if (!files.length) return;

    const invalidFile = files.find(
  (file) =>
    !file.type.startsWith("image/") &&
    !file.type.startsWith("video/") &&
    file.type !== "application/pdf"
);

if (invalidFile) {
  setStatus("Please drop image, video, or PDF files only.");
  return;
}

    void uploadFiles(files);
  };

  document.addEventListener("dragenter", handleDragEnter);
  document.addEventListener("dragover", handleDragOver);
  document.addEventListener("dragleave", handleDragLeave);
  document.addEventListener("drop", handleDrop);

  return () => {
    document.removeEventListener("dragenter", handleDragEnter);
    document.removeEventListener("dragover", handleDragOver);
    document.removeEventListener("dragleave", handleDragLeave);
    document.removeEventListener("drop", handleDrop);
  };
}, [uploading, savingOrder, deletingFrameId, frames]);

async function deleteFrame(frameId: string) {
  const frame = frames.find((item) => item.id === frameId);
  if (!frame) return;

  const confirmed = window.confirm(
    "Delete this frame and its stored media? This cannot be undone."
  );

  if (!confirmed) return;

  setDeletingFrameId(frameId);
  setStatus("");

  try {
    const deleteResponse = await fetch("/api/work/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectId,
        type: "frame",
        frameId,
        storageKey: frame.storageKey,
      }),
    });

    const deleteResult = await deleteResponse.json();

    if (!deleteResponse.ok || !deleteResult.success) {
      throw new Error(
        deleteResult.error || "Failed to delete frame"
      );
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
  if (savingOrder) return;

  const previousFrames = frames;

  // Update the UI immediately.
  setFrames(updatedFrames);
  setSavingOrder(true);
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

    setStatus("Frame order saved.");
  } catch (error) {
    // Restore the previous order if saving fails.
    setFrames(previousFrames);

    setStatus(
      error instanceof Error
        ? error.message
        : "Failed to save frame order."
    );
  } finally {
    setSavingOrder(false);
  }
}

async function moveFrame(index: number, direction: -1 | 1) {
  if (savingOrder) return;

  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= frames.length) return;

  const updatedFrames = [...frames];
  const [movedFrame] = updatedFrames.splice(index, 1);
  updatedFrames.splice(targetIndex, 0, movedFrame);

  await saveFrameOrder(updatedFrames);
}


  return (
    <>
      {fileDragActive && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm">
          <div className="flex min-h-[240px] w-full max-w-2xl flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/80 bg-zinc-950/90 text-center text-white shadow-2xl">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/20">
              <span className="text-3xl">+</span>
            </div>

            <p className="text-sm font-medium uppercase tracking-[0.2em]">
              Drop to add frames
            </p>

            <p className="mt-3 text-xs text-white/50">
              Images, videos, and PDFs · Multiple files supported
            </p>
          </div>
        </div>
      )}

      <section className="mb-10 border-y border-black/10 py-5 dark:border-white/10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium">Project frames</h2>
          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
  {frames.length} frame{frames.length === 1 ? "" : "s"}
  {savingOrder && " · Saving order..."}
</p>
        </div>


<div className="mt-6 space-y-6">
  {frames.map((frame, index) => (

<div
  key={frame.id}
  draggable={!uploading && !savingOrder && deletingFrameId === null}
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

    if (!savingOrder) {
      await saveFrameOrder(updatedFrames);
    }

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
      savingOrder ||
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
      savingOrder ||
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
    disabled={uploading || savingOrder || deletingFrameId !== null}
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
            poster={frame.poster}
            controls
            muted
            playsInline
            className="mx-auto max-h-[70vh] w-full rounded-lg object-contain"
          />
        ) : frame.type === "pdf" ? (
  <PdfViewer
    src={frame.src}
    title={frame.title}
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
          disabled={uploading || savingOrder}
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

      {/* LOCAL VIDEO CONVERTER */}
<section className="mx-auto max-w-6xl px-6 pb-6 pt-3">
  <details className="group">
    <summary className="flex w-fit cursor-pointer list-none items-center gap-2 text-[11px] text-black/40 transition-colors hover:text-black/70 dark:text-white/40 dark:hover:text-white/70">

      <span
        className={`h-1.5 w-1.5 rounded-full ${
          converterConnected
            ? "bg-emerald-500"
            : "bg-amber-500"
        }`}
      />

      <span>
        {converterConnected
          ? "Video converter ready"
          : "Converter offline · Needed for MP4 uploads"}
      </span>

      <span className="ml-1 opacity-50 transition-transform group-open:rotate-180">
        ↓
      </span>
    </summary>

    <div className="mt-4 flex max-w-xl flex-wrap items-end gap-3 pb-3">
      <div className="min-w-[220px] flex-1">
        <label
          htmlFor="converter-token"
          className="mb-2 block text-[10px] uppercase tracking-wider text-black/40 dark:text-white/40"
        >
          Local converter token
        </label>

        <input
          id="converter-token"
          type="password"
          value={converterToken}
          onChange={(event) => {
            setConverterToken(event.target.value);
            setConverterConnected(false);
          }}
          placeholder="Converter token"
          autoComplete="off"
          spellCheck={false}
          className="w-full border-b border-black/20 bg-transparent py-2 text-xs outline-none focus:border-black dark:border-white/20 dark:focus:border-white"
        />
      </div>

      <button
        type="button"
        onClick={() => connectConverter()}
        disabled={!converterToken.trim() || uploading || savingOrder}
        className="pb-2 text-[10px] uppercase tracking-wider text-black/60 transition-opacity hover:opacity-50 disabled:opacity-30 dark:text-white/60"
      >
        {converterConnected ? "Reconnect" : "Connect"}
      </button>
    </div>
  </details>
</section>
    </>
  );
}