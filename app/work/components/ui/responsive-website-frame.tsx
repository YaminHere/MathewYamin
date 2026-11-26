"use client";

import { useEffect, useRef, useState } from "react";

const DESKTOP_VIEWPORT_WIDTH = 1280;
const DESKTOP_VIEWPORT_HEIGHT = 900;
const MOBILE_BREAKPOINT = 768;

interface ResponsiveWebsiteFrameProps {
  src: string;
  title: string;
  forceDesktop?: boolean;
}

export default function ResponsiveWebsiteFrame({
  src,
  title,
  forceDesktop = false,
}: ResponsiveWebsiteFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const isMobile =
  !forceDesktop &&
  containerWidth > 0 &&
  containerWidth < MOBILE_BREAKPOINT;
  const scale = forceDesktop
  ? 1
  : isMobile
    ? 1
    : Math.min(1, containerWidth / DESKTOP_VIEWPORT_WIDTH);

  const frameWidth = isMobile ? containerWidth : DESKTOP_VIEWPORT_WIDTH;
  const frameHeight = isMobile
    ? Math.max(600, Math.round(containerWidth * 0.75))
    : DESKTOP_VIEWPORT_HEIGHT;

  return (
    <div
  ref={containerRef}
  className={`w-full ${forceDesktop ? "overflow-x-auto overflow-y-hidden" : "overflow-hidden"}`}
>
      {containerWidth > 0 && (
        <div
          className="mx-auto overflow-hidden"
          style={{
            width: frameWidth * scale,
            height: frameHeight * scale,
          }}
        >
          <iframe
            src={src}
            title={title}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="block border-0 bg-white"
            style={{
              width: frameWidth,
              height: frameHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          />
        </div>
      )}
    </div>
  );
}