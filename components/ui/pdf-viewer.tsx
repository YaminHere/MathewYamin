"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type PdfViewerProps = {
  src: string;
  title: string;
};

export function PdfViewer({ src, title }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const newWidth = Math.floor(entries[0].contentRect.width);
      setWidth(newWidth);
    });

    observer.observe(container);
    setWidth(container.clientWidth);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setNumPages(0);
    setError("");
  }, [src]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-2xl"
      aria-label={title}
    >
      {width > 0 && (
        <Document
          file={src}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={() => setError("Unable to load this PDF.")}
          loading={
            <p className="py-8 text-center text-sm text-neutral-500">
              Loading PDF...
            </p>
          }
          error={
            <p className="py-8 text-center text-sm text-red-500">
              Unable to load this PDF.
            </p>
          }
        >
          {error ? (
            <p className="py-8 text-center text-sm text-red-500">{error}</p>
          ) : (
            Array.from({ length: numPages }, (_, index) => (
              <div
                key={`${src}-${index}`}
                className="mb-4 overflow-hidden rounded-xl bg-white shadow-sm last:mb-0"
              >
                <Page
                  pageNumber={index + 1}
                  width={width}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading=""
                />
              </div>
            ))
          )}
        </Document>
      )}
    </div>
  );
}