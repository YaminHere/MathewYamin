"use client";

import { useState } from "react";

const FIGMA_FILE_KEY = "MSlJGnPFY1f9fnocZLQMds";

const categoryTargets = {
  "ALL WORK": "97:350",
  BRAND: "215:35",
  PRODUCT: "97:416",
} as const;

const navigation = [
  "ALL WORK",
  "BRAND",
  "PRODUCT",
  "WEB",
  "CAMPAIGNS",
  "VISUAL",
  "ILLUSTRATION",
];

export default function FigmaTestPage() {
  const [active, setActive] = useState("ALL WORK");

  const figmaUrl =
    `https://embed.figma.com/design/${FIGMA_FILE_KEY}` +
    `?embed-host=yamin-portfolio` +
    `&footer=false` +
    `&page-selector=false` +
    `&theme=light`;

  const handleNavigation = (item: string) => {
    setActive(item);

    const target =
      categoryTargets[item as keyof typeof categoryTargets];

    console.log(`Clicked ${item} → ${target ?? "no target defined"}`);

    if (!target) return;

    const iframe = document.querySelector(
      'iframe[title="Yamin Mathew — Work"]'
    ) as HTMLIFrameElement | null;

    if (!iframe) {
      console.log("Figma iframe not found");
      return;
    }

    // Navigation experiment
    iframe.contentWindow?.postMessage(
      {
        type: "NAVIGATE_TO_NODE",
        nodeId: target,
      },
      "https://embed.figma.com"
    );

    console.log("Navigation message sent:", {
      nodeId: target,
    });
  };

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#f7f7f5]">
      {/* Figma Canvas */}
      <iframe
        src={figmaUrl}
        className="absolute inset-0 h-full w-full border-0"
        allowFullScreen
        title="Yamin Mathew — Work"
      />

      {/* Top Interface */}
      <header className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex items-center justify-between p-6">
        {/* Logo / Name */}
        <div className="pointer-events-auto text-sm font-medium tracking-tight">
          MATHEW YAMIN
        </div>

        {/* Navigation */}
        <nav className="pointer-events-auto hidden items-center gap-1 rounded-full bg-white/90 p-1 text-xs shadow-sm backdrop-blur-md md:flex">
          {navigation.map((item) => {
            const hasTarget =
              item in categoryTargets;

            return (
              <button
                key={item}
                onClick={() => handleNavigation(item)}
                className={`rounded-full px-4 py-2 transition ${
                  active === item
                    ? "bg-black text-white"
                    : "text-black/60 hover:bg-black/5 hover:text-black"
                } ${
                  !hasTarget
                    ? "opacity-60"
                    : ""
                }`}
              >
                {item}
              </button>
            );
          })}
        </nav>

        {/* Year */}
        <div className="pointer-events-auto text-xs">
          2026
        </div>
      </header>

      {/* Bottom Interface */}
      <div className="pointer-events-none fixed bottom-6 left-6 right-6 z-50 flex items-end justify-between">
        {/* Status */}
        <div className="pointer-events-auto rounded-full bg-white/90 px-4 py-2 text-xs text-black/50 shadow-sm backdrop-blur-md">
          Figma canvas prototype
        </div>

        {/* Custom Controls */}
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-sm backdrop-blur-md">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"
            aria-label="Zoom out"
          >
            −
          </button>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs hover:bg-black/5"
            aria-label="Reset view"
          >
            ⌖
          </button>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>
    </main>
  );
}