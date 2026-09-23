"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";

const sections = [
  { id: "brand", label: "Brand", x: 0, y: 0 },
  { id: "product", label: "Product", x: 900, y: 0 },
  { id: "web", label: "Web", x: 0, y: 700 },
  { id: "campaigns", label: "Campaigns", x: 900, y: 700 },
  { id: "visual", label: "Visual", x: 1800, y: 0 },
  { id: "illustration", label: "Illustration", x: 1800, y: 700 },
];

const MIN_SCALE = 0.35;
const MAX_SCALE = 2;

const INITIAL_CAMERA = {
  x: 0,
  y: 0,
  scale: 0.7,
};

export default function WorkPage() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  /*
   * Actual camera
   *
   * This is the camera currently rendered on screen.
   */
  const camera = useRef({
    ...INITIAL_CAMERA,
  });

  /*
   * Target camera
   *
   * Wheel / pan interactions update this.
   * The actual camera smoothly follows it.
   */
  const targetCamera = useRef({
    ...INITIAL_CAMERA,
  });

  const animationFrame = useRef<number | null>(null);

  const [dragging, setDragging] = useState(false);

  const dragStart = useRef({
    x: 0,
    y: 0,
  });

  const cameraStart = useRef({
    x: 0,
    y: 0,
  });

  /*
   * Apply camera transform directly to the canvas.
   *
   * This avoids waiting for React state updates for every
   * mouse movement / wheel event.
   */
  const applyTransform = () => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const { x, y, scale } = camera.current;

    canvas.style.transform =
      `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
  };

  /*
   * Smoothly move the actual camera toward its target.
   */
  const animateCamera = () => {
    const current = camera.current;
    const target = targetCamera.current;

    /*
     * Higher = more responsive.
     * Lower = softer / more cinematic.
     */
    const ease = 0.28;

    current.x += (target.x - current.x) * ease;
    current.y += (target.y - current.y) * ease;
    current.scale +=
      (target.scale - current.scale) * ease;

    /*
     * Snap when extremely close to prevent endless
     * tiny animation updates.
     */
    if (
      Math.abs(target.x - current.x) < 0.01 &&
      Math.abs(target.y - current.y) < 0.01 &&
      Math.abs(target.scale - current.scale) < 0.0001
    ) {
      current.x = target.x;
      current.y = target.y;
      current.scale = target.scale;
    }

    applyTransform();

    animationFrame.current =
      requestAnimationFrame(animateCamera);
  };

  /*
   * Start camera animation once.
   */
  useEffect(() => {
    animationFrame.current =
      requestAnimationFrame(animateCamera);

    return () => {
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, []);

  /*
   * PAN
   */

  const handlePointerDown = (
    e: PointerEvent<HTMLDivElement>
  ) => {
    if (e.button !== 0) return;

    const viewport = viewportRef.current;

    if (!viewport) return;

    setDragging(true);

    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
    };

    cameraStart.current = {
      x: targetCamera.current.x,
      y: targetCamera.current.y,
    };

    viewport.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (
    e: PointerEvent<HTMLDivElement>
  ) => {
    if (!dragging) return;

    targetCamera.current.x =
      cameraStart.current.x +
      (e.clientX - dragStart.current.x);

    targetCamera.current.y =
      cameraStart.current.y +
      (e.clientY - dragStart.current.y);
  };

  const handlePointerUp = (
    e: PointerEvent<HTMLDivElement>
  ) => {
    setDragging(false);

    const viewport = viewportRef.current;

    if (
      viewport &&
      viewport.hasPointerCapture(e.pointerId)
    ) {
      viewport.releasePointerCapture(e.pointerId);
    }
  };

  /*
   * CURSOR-ANCHORED ZOOM
   *
   * The canvas point underneath the mouse remains
   * underneath the mouse while zooming.
   */
  const handleWheel = (
    e: WheelEvent<HTMLDivElement>
  ) => {
    e.preventDefault();

    const viewport = viewportRef.current;

    if (!viewport) return;

    const rect =
      viewport.getBoundingClientRect();

    /*
     * Mouse position inside viewport.
     */
    const mouseX =
      e.clientX - rect.left;

    const mouseY =
      e.clientY - rect.top;

    const currentScale =
      targetCamera.current.scale;

    /*
     * Exponential wheel scaling.
     *
     * This behaves better across different mice
     * and trackpads than simply adding a fixed amount.
     */
    const zoomFactor =
      Math.exp(-e.deltaY * 0.0012);

    const nextScale = Math.min(
      MAX_SCALE,
      Math.max(
        MIN_SCALE,
        currentScale * zoomFactor
      )
    );

    if (nextScale === currentScale) {
      return;
    }

    /*
     * Determine which point on the canvas is
     * currently underneath the cursor.
     */
    const canvasX =
      (mouseX - targetCamera.current.x) /
      currentScale;

    const canvasY =
      (mouseY - targetCamera.current.y) /
      currentScale;

    /*
     * Reposition the camera so that exact canvas
     * point remains underneath the cursor.
     */
    targetCamera.current.x =
      mouseX - canvasX * nextScale;

    targetCamera.current.y =
      mouseY - canvasY * nextScale;

    targetCamera.current.scale =
      nextScale;
  };

  /*
   * BUTTON ZOOM
   *
   * Zooms toward the center of the viewport.
   */

  const goToSection = (section: (typeof sections)[number]) => {
  const viewport = viewportRef.current;

  if (!viewport) return;

  const rect = viewport.getBoundingClientRect();

  /*
   * Position the selected section roughly in the
   * center of the viewport.
   */
  const targetScale = 0.7;

  targetCamera.current.scale = targetScale;

  targetCamera.current.x =
    rect.width / 2 -
    (section.x + 310) * targetScale;

  targetCamera.current.y =
    rect.height / 2 -
    (section.y + 210) * targetScale;
};

  const zoom = (amount: number) => {
    const viewport = viewportRef.current;

    if (!viewport) return;

    const rect =
      viewport.getBoundingClientRect();

    const anchorX =
      rect.width / 2;

    const anchorY =
      rect.height / 2;

    const currentScale =
      targetCamera.current.scale;

    const nextScale = Math.min(
      MAX_SCALE,
      Math.max(
        MIN_SCALE,
        currentScale + amount
      )
    );

    if (nextScale === currentScale) {
      return;
    }

    const canvasX =
      (anchorX - targetCamera.current.x) /
      currentScale;

    const canvasY =
      (anchorY - targetCamera.current.y) /
      currentScale;

    targetCamera.current.x =
      anchorX - canvasX * nextScale;

    targetCamera.current.y =
      anchorY - canvasY * nextScale;

    targetCamera.current.scale =
      nextScale;
  };

  /*
   * RESET
   */
  const resetView = () => {
    targetCamera.current = {
      ...INITIAL_CAMERA,
    };
  };

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#f7f7f5] text-[#111]">
      {/* Navigation */}

      <header className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex items-center justify-between p-6">
        <div className="pointer-events-auto text-sm font-medium">
          MATHEW YAMIN
        </div>

        <nav className="pointer-events-auto hidden items-center gap-5 rounded-full bg-white/80 px-5 py-3 text-xs backdrop-blur-md md:flex">
  <button onClick={resetView}>
    ALL WORK
  </button>

  {sections.map((section) => (
    <button
      key={section.id}
      onClick={() => goToSection(section)}
    >
      {section.label.toUpperCase()}
    </button>
  ))}
</nav>

        <div className="pointer-events-auto text-xs">
          2026
        </div>
      </header>

      {/* Canvas viewport */}

      <div
        ref={viewportRef}
        className={`h-full w-full select-none touch-none ${
          dragging
            ? "cursor-grabbing"
            : "cursor-grab"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* Canvas */}

        <div
          ref={canvasRef}
          className="absolute left-0 top-0 will-change-transform"
          style={{
            transform:
              `translate3d(${INITIAL_CAMERA.x}px, ${INITIAL_CAMERA.y}px, 0) scale(${INITIAL_CAMERA.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Canvas title */}

          <div
            className="absolute"
            style={{
              left: 120,
              top: 180,
              width: 600,
            }}
          >
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-black/40">
              Selected + extended work
            </p>

            <h1 className="text-7xl font-medium tracking-[-0.06em]">
              All Work
            </h1>

            <p className="mt-6 max-w-md text-lg leading-relaxed text-black/50">
              A spatial archive of brand, product,
              web, campaigns, visual design and
              illustration.
            </p>
          </div>

          {/* Section markers */}

          {sections.map((section) => (
            <div
              key={section.id}
              className="absolute"
              style={{
                left: section.x,
                top: section.y,
              }}
            >
              <div className="mb-5 text-xs uppercase tracking-[0.2em] text-black/40">
                {section.label}
              </div>

              <div className="h-[420px] w-[620px] rounded-[2rem] border border-black/10 bg-white/60 p-6">
                <div className="flex h-full items-center justify-center text-sm text-black/20">
                  {section.label} work
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas controls */}

      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-sm backdrop-blur-md">
        <button
          onClick={() => zoom(-0.1)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"
        >
          −
        </button>

        <button
          onClick={resetView}
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs hover:bg-black/5"
        >
          ⌖
        </button>

        <button
          onClick={() => zoom(0.1)}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"
        >
          +
        </button>
      </div>

      {/* Minimap */}

      <div className="fixed bottom-6 left-6 z-50 hidden h-28 w-44 overflow-hidden rounded-xl border border-black/10 bg-white/70 p-2 backdrop-blur-md md:block">
        <div className="relative h-full w-full">
          {sections.map((section) => (
            <div
              key={section.id}
              className="absolute h-6 w-10 rounded bg-black/10"
              style={{
                left: section.x / 25,
                top: section.y / 25,
              }}
            />
          ))}

          <div className="absolute left-2 top-2 h-16 w-24 rounded border border-black/60" />
        </div>
      </div>
    </main>
  );
}