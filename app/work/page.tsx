"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";

import { projectManifest } from "@/data/project-manifest";

type ProjectFrame = {
  id: string;
  title: string;
  type: "image" | "video" | "gif" | "pdf";
  src: string;
  position: {
    x: number;
    y: number;
  };
  width?: number;
  height?: number;
};

type FrameSize = {
  width: number;
  height: number;
};

type Project = {
  id: string;
  title: string;
  year: number;
  classifications: string[];
  position: {
    x: number;
    y: number;
  };
  frames: ProjectFrame[];
};

const sections = [
  { id: "brand", label: "Brand" },
  { id: "product", label: "Product" },
  { id: "web", label: "Web" },
  { id: "campaigns", label: "Campaigns" },
  { id: "visual", label: "Visual" },
  { id: "illustration", label: "Illustration" },
];

const MIN_SCALE = 0.35;
const MAX_SCALE = 2;

const INITIAL_CAMERA = {
  x: 0,
  y: 0,
  scale: 0.7,
};

const getProjectSize = (
  project: Project,
  frameSizes: Record<string, FrameSize> = {},
  framePositions: Record<
    string,
    { x: number; y: number }
  > = {}
) => {
  const padding = 40;
  const labelHeight = 28;

  const width =
    Math.max(
      ...project.frames.map((frame) => {
        const position =
          framePositions[
            `${project.id}:${frame.id}`
          ] ?? frame.position;

        const size =
          frameSizes[
            `${project.id}:${frame.id}`
          ] ?? {
            width: 420,
            height: 300,
          };

        return (
          position.x +
          size.width
        );
      }),
      0
    ) + padding;

  const height =
    Math.max(
      ...project.frames.map((frame) => {
        const position =
          framePositions[
            `${project.id}:${frame.id}`
          ] ?? frame.position;

        const size =
          frameSizes[
            `${project.id}:${frame.id}`
          ] ?? {
            width: 420,
            height: 300,
          };

        return (
          position.y +
          labelHeight +
          size.height
        );
      }),
      0
    ) + padding;

  return {
    width,
    height,
  };
};

const buildCollageLayout = (
  projects: Project[],
  focalId: string,
  anchorX: number,
  anchorY: number,
  frameSizes: Record<string, FrameSize> = {},
  framePositions: Record<
    string,
    { x: number; y: number }
  > = {},
  gap = 100
) => {
  const positions: Record<
    string,
    { x: number; y: number }
  > = {};

  const focalProject =
    projects.find(
      (project) =>
        project.id === focalId
    );

  if (!focalProject) {
    return positions;
  }

  const focalSize =
    getProjectSize(
      focalProject,
      frameSizes,
      framePositions
    );

  // ------------------------------------------------
  // FOCAL PROJECT
  // ------------------------------------------------

  positions[focalId] = {
    x:
      anchorX -
      focalSize.width / 2,

    y:
      anchorY -
      focalSize.height / 2,
  };

  // ------------------------------------------------
  // OTHER PROJECTS
  // ------------------------------------------------

  const remainingProjects =
    projects
      .filter(
        (project) =>
          project.id !== focalId
      )
      .sort((a, b) => {
        const sizeA =
          getProjectSize(
            a,
            frameSizes,
            framePositions
          );

        const sizeB =
          getProjectSize(
            b,
            frameSizes,
            framePositions
          );

        return (
          sizeB.width *
            sizeB.height -
          sizeA.width *
            sizeA.height
        );
      });

  // ------------------------------------------------
  // CANDIDATE POSITIONS
  // ------------------------------------------------

  const getCandidates = (
    project: Project
  ) => {
    const size =
      getProjectSize(
        project,
        frameSizes,
        framePositions
      );

    const candidates: {
      x: number;
      y: number;
    }[] = [];

    Object.entries(
      positions
    ).forEach(
      ([placedId, position]) => {
        const placedProject =
          projects.find(
            (item) =>
              item.id === placedId
          );

        if (!placedProject) {
          return;
        }

        const placedSize =
          getProjectSize(
            placedProject,
            frameSizes,
            framePositions
          );

        // Right
        candidates.push({
          x:
            position.x +
            placedSize.width +
            gap,

          y:
            position.y,
        });

        // Left
        candidates.push({
          x:
            position.x -
            size.width -
            gap,

          y:
            position.y,
        });

        // Bottom
        candidates.push({
          x:
            position.x,

          y:
            position.y +
            placedSize.height +
            gap,
        });

        // Top
        candidates.push({
          x:
            position.x,

          y:
            position.y -
            size.height -
            gap,
        });

        // Diagonal
        candidates.push({
          x:
            position.x +
            placedSize.width +
            gap,

          y:
            position.y +
            placedSize.height -
            size.height,
        });

        candidates.push({
          x:
            position.x -
            size.width -
            gap,

          y:
            position.y +
            placedSize.height -
            size.height,
        });

        candidates.push({
          x:
            position.x +
            placedSize.width -
            size.width,

          y:
            position.y +
            placedSize.height +
            gap,
        });

        candidates.push({
          x:
            position.x +
            placedSize.width -
            size.width,

          y:
            position.y -
            size.height -
            gap,
        });
      }
    );

    return candidates;
  };

  // ------------------------------------------------
  // RECTANGLE COLLISION
  // ------------------------------------------------

  const overlaps = (
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    return Object.entries(
      positions
    ).some(
      ([projectId, position]) => {
        const other =
          projects.find(
            (project) =>
              project.id ===
              projectId
          );

        if (!other) {
          return false;
        }

        const otherSize =
          getProjectSize(
            other,
            frameSizes,
            framePositions
          );

        return !(
          x +
            width +
            gap <=
            position.x ||
          x >=
            position.x +
              otherSize.width +
              gap ||
          y +
            height +
            gap <=
            position.y ||
          y >=
            position.y +
              otherSize.height +
              gap
        );
      }
    );
  };

  // ------------------------------------------------
  // PLACE PROJECTS
  // ------------------------------------------------

  remainingProjects.forEach(
    (project) => {
      const size =
        getProjectSize(
          project,
          frameSizes,
          framePositions
        );

      const candidates =
        getCandidates(project);

      let bestCandidate:
        | {
            x: number;
            y: number;
          }
        | null = null;

      let bestScore =
        Infinity;

      candidates.forEach(
        (candidate) => {
          if (
            overlaps(
              candidate.x,
              candidate.y,
              size.width,
              size.height
            )
          ) {
            return;
          }

          const centerX =
            candidate.x +
            size.width / 2;

          const centerY =
            candidate.y +
            size.height / 2;

          const distance =
            Math.hypot(
              centerX -
                anchorX,
              centerY -
                anchorY
            );

          const verticalPenalty =
            Math.abs(
              centerY -
                anchorY
            ) * 0.15;

          const score =
            distance +
            verticalPenalty;

          if (
            score <
            bestScore
          ) {
            bestScore =
              score;

            bestCandidate =
              candidate;
          }
        }
      );

      // Fallback
      if (!bestCandidate) {
        bestCandidate = {
          x:
            anchorX +
            gap,

          y:
            anchorY +
            gap,
        };

        let attempts = 0;

        while (
          overlaps(
            bestCandidate.x,
            bestCandidate.y,
            size.width,
            size.height
          ) &&
          attempts < 100
        ) {
          bestCandidate.x +=
            size.width +
            gap;

          attempts++;
        }
      }

      positions[project.id] =
        bestCandidate;
    }
  );

  return positions;
};

export default function WorkPage() {
  const viewportRef =
    useRef<HTMLDivElement>(null);

  const canvasRef =
    useRef<HTMLDivElement>(null);

  // --------------------------------------------------
  // CAMERA
  // --------------------------------------------------

  const camera = useRef({
    ...INITIAL_CAMERA,
  });

  const targetCamera = useRef({
    ...INITIAL_CAMERA,
  });

  const animationFrame =
    useRef<number | null>(null);

  // --------------------------------------------------
  // CANVAS DRAGGING
  // --------------------------------------------------

  const [dragging, setDragging] =
    useState(false);

  const dragStart = useRef({
    x: 0,
    y: 0,
  });

  const cameraStart = useRef({
    x: 0,
    y: 0,
  });

  // --------------------------------------------------
  // PROJECT POSITIONS
  // --------------------------------------------------

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [projectPositions, setProjectPositions] =
    useState<
      Record<
        string,
        { x: number; y: number }
      >
    >({});

  const [physicsPositions, setPhysicsPositions] =
    useState<
      Record<
        string,
        { x: number; y: number }
      >
    >({});

  const [frameSizes, setFrameSizes] =
    useState<
      Record<string, FrameSize>
    >({});

  const [framePositions, setFramePositions] =
    useState<
      Record<
        string,
        { x: number; y: number }
      >
    >({});

  const [unlockedProjects, setUnlockedProjects] =
    useState<
      Record<string, boolean>
    >({});

  const [
    activeClassification,
    setActiveClassification,
  ] = useState<string | null>(null);

  const attractionPoint =
    useRef<{
      x: number;
      y: number;
    } | null>(null);

  const activeTargets =
    useRef<
      Record<
        string,
        { x: number; y: number }
      >
    >({});

  const inactiveTargets =
    useRef<
      Record<
        string,
        { x: number; y: number }
      >
    >({});

  const focalProjectId =
    useRef<string | null>(null);

  const projectDrag =
    useRef<{
      id: string;
      startX: number;
      startY: number;
      projectX: number;
      projectY: number;
    } | null>(null);

  const frameDrag =
    useRef<{
      projectId: string;
      frameId: string;
      startX: number;
      startY: number;
      frameX: number;
      frameY: number;
    } | null>(null);

  const frameResize =
    useRef<{
      projectId: string;
      frameId: string;
      startX: number;
      startY: number;
      width: number;
      height: number;
    } | null>(null);

  // --------------------------------------------------
  // PROJECT LOCK
  // --------------------------------------------------

  const toggleProjectLock = (
    projectId: string
  ) => {
    setUnlockedProjects(
      (current) => ({
        ...current,
        [projectId]:
          !current[projectId],
      })
    );
  };

  const saveProject = async (projectId: string) => {
  const project = projects.find(
    (project) => project.id === projectId
  );

  if (!project) return;

  const position =
    projectPositions[projectId] ??
    project.position;

  const frames = project.frames.map((frame) => {
    const key = `${projectId}:${frame.id}`;

    const framePosition =
      framePositions[key] ??
      frame.position;

    const frameSize =
      frameSizes[key];

    return {
      id: frame.id,
      position: framePosition,
      ...(frameSize
        ? {
            width: frameSize.width,
            height: frameSize.height,
          }
        : {}),
    };
  });

  try {
    const response = await fetch(
      "/api/work/save",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          projectPosition: position,
          frames,
        }),
      }
    );

    const result = await response.json();

if (!response.ok) {
  throw new Error(
    result.error ||
      `Save failed with status ${response.status}`
  );
}

console.log(
  "SAVE SUCCESS:",
  result
);

  } catch (error) {
  console.error(
    "SAVE ERROR:",
    error
  );
}
};

const saveAllProjects = async () => {
  for (const project of projects) {
    await saveProject(project.id);
  }
};

  // --------------------------------------------------
  // LOAD PROJECTS
  // --------------------------------------------------

  useEffect(() => {
    const loadProjects =
      async () => {
        const loadedProjects =
          await Promise.all(
            projectManifest.map(
              async (projectId) => {
                const response =
                  await fetch(
                    `/work/${projectId}/project.json`
                  );

                if (!response.ok) {
                  throw new Error(
                    `Failed to load project: ${projectId}`
                  );
                }

                return response.json() as Promise<Project>;
              }
            )
          );

        setProjects(
          loadedProjects
        );

        const initialPositions =
          Object.fromEntries(
            loadedProjects.map(
              (project) => [
                project.id,
                {
                  x:
                    project.position
                      .x,

                  y:
                    project.position
                      .y,
                },
              ]
            )
          );

        const initialFramePositions =
  Object.fromEntries(
    loadedProjects.flatMap((project) =>
      project.frames.map((frame) => [
        `${project.id}:${frame.id}`,
        {
          x: frame.position.x,
          y: frame.position.y,
        },
      ])
    )
  );

const initialFrameSizes =
  Object.fromEntries(
    loadedProjects.flatMap((project) =>
      project.frames
        .filter(
          (frame) =>
            frame.width &&
            frame.height
        )
        .map((frame) => [
          `${project.id}:${frame.id}`,
          {
            width: frame.width!,
            height: frame.height!,
          },
        ])
    )
  );

setProjectPositions(initialPositions);
setFramePositions(initialFramePositions);
setFrameSizes(initialFrameSizes);
setPhysicsPositions(initialPositions);
      };

    loadProjects().catch(
      console.error
    );
  }, []);

  // --------------------------------------------------
  // RESOLVE ACTIVE COLLAGE COLLISIONS
  // --------------------------------------------------

  const resolveActiveCollisions = (
    activeProjects: Project[],
    positions: Record<
      string,
      { x: number; y: number }
    >,
    focalId: string | null,
    gap = 100
  ) => {
    const next = {
      ...positions,
    };

    const getPosition = (
      project: Project
    ) =>
      next[project.id] ?? {
        x: 0,
        y: 0,
      };

    /*
     * Repeatedly resolve overlaps.
     *
     * The focal project stays fixed.
     * Other projects move away from it
     * and from one another.
     *
     * This runs again whenever frame
     * positions or sizes change.
     */
    for (
      let pass = 0;
      pass < 12;
      pass++
    ) {
      let changed = false;

      for (
        let i = 0;
        i < activeProjects.length;
        i++
      ) {
        for (
          let j = i + 1;
          j < activeProjects.length;
          j++
        ) {
          const a =
            activeProjects[i];

          const b =
            activeProjects[j];

          const aPosition =
            getPosition(a);

          const bPosition =
            getPosition(b);

          const aSize =
            getProjectSize(
              a,
              frameSizes,
              framePositions
            );

          const bSize =
            getProjectSize(
              b,
              frameSizes,
              framePositions
            );

          const aRight =
            aPosition.x +
            aSize.width;

          const bRight =
            bPosition.x +
            bSize.width;

          const aBottom =
            aPosition.y +
            aSize.height;

          const bBottom =
            bPosition.y +
            bSize.height;

          /*
           * Actual separation including
           * breathing room.
           */
          const separated =
            aRight + gap <=
              bPosition.x ||
            bRight + gap <=
              aPosition.x ||
            aBottom + gap <=
              bPosition.y ||
            bBottom + gap <=
              aPosition.y;

          if (separated) {
            continue;
          }

          const overlapX =
            Math.min(
              aRight +
                gap -
                bPosition.x,

              bRight +
                gap -
                aPosition.x
            );

          const overlapY =
            Math.min(
              aBottom +
                gap -
                bPosition.y,

              bBottom +
                gap -
                aPosition.y
            );

          const aCenterX =
            aPosition.x +
            aSize.width / 2;

          const bCenterX =
            bPosition.x +
            bSize.width / 2;

          const aCenterY =
            aPosition.y +
            aSize.height / 2;

          const bCenterY =
            bPosition.y +
            bSize.height / 2;

          const aIsFocal =
            a.id === focalId;

          const bIsFocal =
            b.id === focalId;

          /*
           * Resolve along the axis requiring
           * the least movement.
           */
          if (
            overlapX <=
            overlapY
          ) {
            const aIsLeft =
              aCenterX <
              bCenterX;

            if (aIsFocal) {
              next[b.id] = {
                x:
                  bPosition.x +
                  (aIsLeft
                    ? overlapX
                    : -overlapX),

                y:
                  bPosition.y,
              };
            } else if (
              bIsFocal
            ) {
              next[a.id] = {
                x:
                  aPosition.x +
                  (aIsLeft
                    ? -overlapX
                    : overlapX),

                y:
                  aPosition.y,
              };
            } else {
              const half =
                overlapX / 2;

              next[a.id] = {
                x:
                  aPosition.x +
                  (aIsLeft
                    ? -half
                    : half),

                y:
                  aPosition.y,
              };

              next[b.id] = {
                x:
                  bPosition.x +
                  (aIsLeft
                    ? half
                    : -half),

                y:
                  bPosition.y,
              };
            }
          } else {
            const aIsAbove =
              aCenterY <
              bCenterY;

            if (aIsFocal) {
              next[b.id] = {
                x:
                  bPosition.x,

                y:
                  bPosition.y +
                  (aIsAbove
                    ? overlapY
                    : -overlapY),
              };
            } else if (
              bIsFocal
            ) {
              next[a.id] = {
                x:
                  aPosition.x,

                y:
                  aPosition.y +
                  (aIsAbove
                    ? -overlapY
                    : overlapY),
              };
            } else {
              const half =
                overlapY / 2;

              next[a.id] = {
                x:
                  aPosition.x,

                y:
                  aPosition.y +
                  (aIsAbove
                    ? -half
                    : half),
              };

              next[b.id] = {
                x:
                  bPosition.x,

                y:
                  bPosition.y +
                  (aIsAbove
                    ? half
                    : -half),
              };
            }
          }

          changed = true;
        }
      }

      if (!changed) {
        break;
      }
    }

    return next;
  };

 // --------------------------------------------------
// REBUILD ACTIVE COLLAGE WHEN FRAME GEOMETRY CHANGES
// --------------------------------------------------

useEffect(() => {
  if (
    !activeClassification ||
    projects.length === 0 ||
    !focalProjectId.current
  ) {
    return;
  }

  const activeProjects =
    projects.filter(
      (project) =>
        project.classifications.includes(
          activeClassification
        )
    );

  if (activeProjects.length === 0) {
    return;
  }

  const focalProject =
    activeProjects.find(
      (project) =>
        project.id ===
        focalProjectId.current
    );

  if (!focalProject) {
    return;
  }

  const focalPosition =
    activeTargets.current[
      focalProject.id
    ];

  if (!focalPosition) {
    return;
  }

  const focalSize =
    getProjectSize(
      focalProject,
      frameSizes,
      framePositions
    );

  // Keep the focal project's CENTER
  // exactly where it currently is.
  const anchorX =
    focalPosition.x +
    focalSize.width / 2;

  const anchorY =
    focalPosition.y +
    focalSize.height / 2;

  // Completely rebuild the collage using
  // the NEW project dimensions.
  const rebuiltLayout =
    buildCollageLayout(
      activeProjects,
      focalProject.id,
      anchorX,
      anchorY,
      frameSizes,
      framePositions,
      100
    );

  // Final collision pass.
  const resolvedLayout =
    resolveActiveCollisions(
      activeProjects,
      rebuiltLayout,
      focalProject.id,
      100
    );

  activeTargets.current =
    resolvedLayout;
}, [
  activeClassification,
  projects,
  frameSizes,
  framePositions,
]);

  // --------------------------------------------------
  // ACTIVE COLLAGE ANIMATION
  // --------------------------------------------------

  useEffect(() => {
    if (
      !activeClassification ||
      projects.length === 0
    ) {
      return;
    }

    let frameId: number;

    const animate = () => {
      setPhysicsPositions(
        (current) => {
          const next = {
            ...current,
          };

          projects.forEach(
            (project) => {
              const currentPosition =
                current[
                  project.id
                ] ??
                projectPositions[
                  project.id
                ] ??
                project.position;

              const target =
                activeTargets
                  .current[
                    project.id
                  ] ??
                inactiveTargets
                  .current[
                    project.id
                  ];

              if (!target) {
                return;
              }

              const dx =
                target.x -
                currentPosition.x;

              const dy =
                target.y -
                currentPosition.y;

              const distance =
                Math.hypot(
                  dx,
                  dy
                );

              if (
                distance < 0.5
              ) {
                next[
                  project.id
                ] = target;

                return;
              }

              const strength =
                0.12;

              next[
                project.id
              ] = {
                x:
                  currentPosition.x +
                  dx *
                    strength,

                y:
                  currentPosition.y +
                  dy *
                    strength,
              };
            }
          );

          return next;
        }
      );

      frameId =
        requestAnimationFrame(
          animate
        );
    };

    frameId =
      requestAnimationFrame(
        animate
      );

    return () => {
      cancelAnimationFrame(
        frameId
      );
    };
  }, [
    activeClassification,
    projects,
    projectPositions,
  ]);

  // --------------------------------------------------
  // CAMERA TRANSFORM
  // --------------------------------------------------

  const applyTransform =
    () => {
      const canvas =
        canvasRef.current;

      if (!canvas) return;

      const {
        x,
        y,
        scale,
      } = camera.current;

      canvas.style.transform =
        `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    };

  const animateCamera =
    () => {
      const current =
        camera.current;

      const target =
        targetCamera.current;

      const ease = 0.28;

      current.x +=
        (target.x -
          current.x) *
        ease;

      current.y +=
        (target.y -
          current.y) *
        ease;

      current.scale +=
        (target.scale -
          current.scale) *
        ease;

      if (
        Math.abs(
          target.x -
            current.x
        ) < 0.01 &&
        Math.abs(
          target.y -
            current.y
        ) < 0.01 &&
        Math.abs(
          target.scale -
            current.scale
        ) < 0.0001
      ) {
        current.x =
          target.x;

        current.y =
          target.y;

        current.scale =
          target.scale;
      }

      applyTransform();

      animationFrame.current =
        requestAnimationFrame(
          animateCamera
        );
    };

  useEffect(() => {
    animationFrame.current =
      requestAnimationFrame(
        animateCamera
      );

    return () => {
      if (
        animationFrame.current !==
        null
      ) {
        cancelAnimationFrame(
          animationFrame.current
        );
      }
    };
  }, []);

  // --------------------------------------------------
  // CANVAS PAN
  // --------------------------------------------------

  const handlePointerDown = (
    e: PointerEvent<HTMLDivElement>
  ) => {
    if (e.button !== 0) return;

    const viewport =
      viewportRef.current;

    if (!viewport) return;

    setDragging(true);

    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
    };

    cameraStart.current = {
      x:
        targetCamera.current
          .x,

      y:
        targetCamera.current
          .y,
    };

    viewport.setPointerCapture(
      e.pointerId
    );
  };

  const handlePointerMove = (
    e: PointerEvent<HTMLDivElement>
  ) => {
    if (!dragging) return;

    targetCamera.current.x =
      cameraStart.current.x +
      (e.clientX -
        dragStart.current.x);

    targetCamera.current.y =
      cameraStart.current.y +
      (e.clientY -
        dragStart.current.y);
  };

  const handlePointerUp = (
    e: PointerEvent<HTMLDivElement>
  ) => {
    setDragging(false);

    const viewport =
      viewportRef.current;

    if (
      viewport &&
      viewport.hasPointerCapture(
        e.pointerId
      )
    ) {
      viewport.releasePointerCapture(
        e.pointerId
      );
    }
  };

  // --------------------------------------------------
  // FRAME DRAGGING
  // --------------------------------------------------

  const handleFramePointerDown = (
    e: PointerEvent<HTMLDivElement>,
    projectId: string,
    frameId: string
  ) => {
    if (
      !unlockedProjects[
        projectId
      ]
    ) {
      return;
    }

    e.stopPropagation();

    const position =
      framePositions[
        `${projectId}:${frameId}`
      ];

    if (!position) return;

    frameDrag.current = {
      projectId,
      frameId,
      startX: e.clientX,
      startY: e.clientY,
      frameX: position.x,
      frameY: position.y,
    };

    e.currentTarget.setPointerCapture(
      e.pointerId
    );
  };

  const handleFramePointerMove = (
    e: PointerEvent<HTMLDivElement>
  ) => {
    const drag =
      frameDrag.current;

    if (!drag) return;

    const scale =
      camera.current.scale;

    const dx =
      (e.clientX -
        drag.startX) /
      scale;

    const dy =
      (e.clientY -
        drag.startY) /
      scale;

    const nextX =
      Math.max(
        0,
        drag.frameX + dx
      );

    const nextY =
      Math.max(
        0,
        drag.frameY + dy
      );

    setFramePositions(
      (current) => ({
        ...current,
        [`${drag.projectId}:${drag.frameId}`]:
          {
            x: nextX,
            y: nextY,
          },
      })
    );
  };

  const handleFramePointerUp = (
    e: PointerEvent<HTMLDivElement>
  ) => {
    frameDrag.current =
      null;

    if (
      e.currentTarget.hasPointerCapture(
        e.pointerId
      )
    ) {
      e.currentTarget.releasePointerCapture(
        e.pointerId
      );
    }
  };

  // --------------------------------------------------
  // FRAME RESIZING
  // --------------------------------------------------

  const handleFrameResizePointerDown = (
    e: PointerEvent<HTMLDivElement>,
    projectId: string,
    frameId: string
  ) => {
    if (
      !unlockedProjects[
        projectId
      ]
    ) {
      return;
    }

    e.stopPropagation();

    const size =
      frameSizes[
        `${projectId}:${frameId}`
      ];

    if (!size) return;

    frameResize.current = {
      projectId,
      frameId,
      startX: e.clientX,
      startY: e.clientY,
      width: size.width,
      height: size.height,
    };

    e.currentTarget.setPointerCapture(
      e.pointerId
    );
  };

  const handleFrameResizePointerMove = (
    e: PointerEvent<HTMLDivElement>
  ) => {
    const resize =
      frameResize.current;

    if (!resize) return;

    const scale =
      camera.current.scale;

    const dx =
      (e.clientX -
        resize.startX) /
      scale;

    const dy =
      (e.clientY -
        resize.startY) /
      scale;

    const aspectRatio =
      resize.width /
      resize.height;

    const delta =
      Math.abs(dx) >
      Math.abs(dy)
        ? dx
        : dy * aspectRatio;

    const minWidth = 160;
    const minHeight = 120;

    const nextWidth =
      Math.max(
        minWidth,
        resize.width +
          delta
      );

    const nextHeight =
      Math.max(
        minHeight,
        nextWidth /
          aspectRatio
      );

    setFrameSizes(
      (current) => ({
        ...current,
        [`${resize.projectId}:${resize.frameId}`]:
          {
            width:
              nextWidth,

            height:
              nextHeight,
          },
      })
    );
  };

  const handleFrameResizePointerUp = (
    e: PointerEvent<HTMLDivElement>
  ) => {
    frameResize.current =
      null;

    if (
      e.currentTarget.hasPointerCapture(
        e.pointerId
      )
    ) {
      e.currentTarget.releasePointerCapture(
        e.pointerId
      );
    }
  };

  // --------------------------------------------------
  // MOUSE WHEEL ZOOM
  // --------------------------------------------------

  const handleWheel = (
    e: WheelEvent<HTMLDivElement>
  ) => {
    e.preventDefault();

    const viewport =
      viewportRef.current;

    if (!viewport) return;

    const rect =
      viewport.getBoundingClientRect();

    const mouseX =
      e.clientX -
      rect.left;

    const mouseY =
      e.clientY -
      rect.top;

    const currentScale =
      targetCamera.current
        .scale;

    const zoomFactor =
      Math.exp(
        -e.deltaY * 0.0012
      );

    const nextScale =
      Math.min(
        MAX_SCALE,
        Math.max(
          MIN_SCALE,
          currentScale *
            zoomFactor
        )
      );

    if (
      nextScale ===
      currentScale
    ) {
      return;
    }

    const canvasX =
      (mouseX -
        targetCamera.current
          .x) /
      currentScale;

    const canvasY =
      (mouseY -
        targetCamera.current
          .y) /
      currentScale;

    targetCamera.current.x =
      mouseX -
      canvasX *
        nextScale;

    targetCamera.current.y =
      mouseY -
      canvasY *
        nextScale;

    targetCamera.current.scale =
      nextScale;
  };

  // --------------------------------------------------
  // BUTTON ZOOM
  // --------------------------------------------------

  const zoom = (
    amount: number
  ) => {
    const viewport =
      viewportRef.current;

    if (!viewport) return;

    const rect =
      viewport.getBoundingClientRect();

    const anchorX =
      rect.width / 2;

    const anchorY =
      rect.height / 2;

    const currentScale =
      targetCamera.current
        .scale;

    const nextScale =
      Math.min(
        MAX_SCALE,
        Math.max(
          MIN_SCALE,
          currentScale +
            amount
        )
      );

    if (
      nextScale ===
      currentScale
    ) {
      return;
    }

    const canvasX =
      (anchorX -
        targetCamera.current
          .x) /
      currentScale;

    const canvasY =
      (anchorY -
        targetCamera.current
          .y) /
      currentScale;

    targetCamera.current.x =
      anchorX -
      canvasX *
        nextScale;

    targetCamera.current.y =
      anchorY -
      canvasY *
        nextScale;

    targetCamera.current.scale =
      nextScale;
  };

  // --------------------------------------------------
  // RESET CAMERA
  // --------------------------------------------------

  const resetView = () => {
    attractionPoint.current =
      null;

    activeTargets.current =
      {};

    inactiveTargets.current =
      {};

    focalProjectId.current =
      null;

    setActiveClassification(
      null
    );

    setPhysicsPositions(
      projectPositions
    );

    targetCamera.current = {
      ...INITIAL_CAMERA,
    };
  };

  // --------------------------------------------------
  // CATEGORY NAVIGATION
  // --------------------------------------------------

  const goToSection = (
    section: (typeof sections)[number]
  ) => {
    const viewport =
      viewportRef.current;

    if (!viewport) return;

    const rect =
      viewport.getBoundingClientRect();

    const anchorX =
      (rect.width / 2 -
        targetCamera.current
          .x) /
      targetCamera.current
        .scale;

    const anchorY =
      (rect.height / 2 -
        targetCamera.current
          .y) /
      targetCamera.current
        .scale;

    const activeProjects =
      projects.filter(
        (project) =>
          project.classifications.includes(
            section.id
          )
      );

    if (
      activeProjects.length ===
      0
    ) {
      return;
    }

    // ------------------------------------------------
    // FIND FOCAL PROJECT
    // ------------------------------------------------

    let focalProject =
      activeProjects[0];

    let closestDistance =
      Infinity;

    activeProjects.forEach(
      (project) => {
        const position =
          physicsPositions[
            project.id
          ] ??
          projectPositions[
            project.id
          ] ??
          project.position;

        const size =
          getProjectSize(
            project,
            frameSizes,
            framePositions
          );

        const centerX =
          position.x +
          size.width / 2;

        const centerY =
          position.y +
          size.height / 2;

        const distance =
          Math.hypot(
            centerX -
              anchorX,
            centerY -
              anchorY
          );

        if (
          distance <
          closestDistance
        ) {
          closestDistance =
            distance;

          focalProject =
            project;
        }
      }
    );

    // ------------------------------------------------
    // BUILD COLLAGE
    // ------------------------------------------------

    const layout =
      buildCollageLayout(
        activeProjects,
        focalProject.id,
        anchorX,
        anchorY,
        frameSizes,
        framePositions
      );

    /*
     * Immediately resolve the freshly-created
     * layout as well.
     */
    activeTargets.current =
      resolveActiveCollisions(
        activeProjects,
        layout,
        focalProject.id
      );

    focalProjectId.current =
      focalProject.id;

    // ------------------------------------------------
    // ACTIVE COMPOSITION BOUNDS
    // ------------------------------------------------

    const activeEntries =
      activeProjects.map(
        (project) => {
          const position =
            activeTargets.current[
              project.id
            ];

          const size =
            getProjectSize(
              project,
              frameSizes,
              framePositions
            );

          return {
            project,
            position,
            size,
          };
        }
      );

    const compositionLeft =
      Math.min(
        ...activeEntries.map(
          ({
            position,
          }) =>
            position.x
        )
      );

    const compositionRight =
      Math.max(
        ...activeEntries.map(
          ({
            position,
            size,
          }) =>
            position.x +
            size.width
        )
      );

    const compositionTop =
      Math.min(
        ...activeEntries.map(
          ({
            position,
          }) =>
            position.y
        )
      );

    const compositionBottom =
      Math.max(
        ...activeEntries.map(
          ({
            position,
            size,
          }) =>
            position.y +
            size.height
        )
      );

    const compositionCenterX =
      (compositionLeft +
        compositionRight) /
      2;

    const compositionCenterY =
      (compositionTop +
        compositionBottom) /
      2;

    // ------------------------------------------------
    // MOVE INACTIVE PROJECTS AWAY
    // ------------------------------------------------

    const nextInactiveTargets:
      Record<
        string,
        { x: number; y: number }
      > = {};

    const inactiveProjects =
      projects.filter(
        (project) =>
          !project.classifications.includes(
            section.id
          )
      );

    const inactiveGap = 300;

    const compositionBounds =
      {
        left:
          compositionLeft -
          inactiveGap,

        right:
          compositionRight +
          inactiveGap,

        top:
          compositionTop -
          inactiveGap,

        bottom:
          compositionBottom +
          inactiveGap,
      };

    // ------------------------------------------------
    // CHECK OVERLAP
    // ------------------------------------------------

    const overlapsTarget = (
      x: number,
      y: number,
      width: number,
      height: number
    ) => {
      // Active projects
      for (
        const project of
        activeProjects
      ) {
        const position =
          activeTargets.current[
            project.id
          ];

        if (!position) {
          continue;
        }

        const size =
          getProjectSize(
            project,
            frameSizes,
            framePositions
          );

        if (
          x <
            position.x +
              size.width +
              inactiveGap &&
          x +
            width +
            inactiveGap >
            position.x &&
          y <
            position.y +
              size.height +
              inactiveGap &&
          y +
            height +
            inactiveGap >
            position.y
        ) {
          return true;
        }
      }

      // Inactive projects already placed
      for (
        const project of
        inactiveProjects
      ) {
        const position =
          nextInactiveTargets[
            project.id
          ];

        if (!position) {
          continue;
        }

        const size =
          getProjectSize(
            project,
            frameSizes,
            framePositions
          );

        if (
          x <
            position.x +
              size.width +
              inactiveGap &&
          x +
            width +
            inactiveGap >
            position.x &&
          y <
            position.y +
              size.height +
              inactiveGap &&
          y +
            height +
            inactiveGap >
            position.y
        ) {
          return true;
        }
      }

      return false;
    };

    // ------------------------------------------------
    // PLACE INACTIVE PROJECTS
    // ------------------------------------------------

    inactiveProjects.forEach(
      (project) => {
        const current =
          physicsPositions[
            project.id
          ] ??
          projectPositions[
            project.id
          ] ??
          project.position;

        const size =
          getProjectSize(
            project,
            frameSizes,
            framePositions
          );

        const centerX =
          current.x +
          size.width / 2;

        const centerY =
          current.y +
          size.height / 2;

        const insideComposition =
          centerX >
            compositionBounds.left &&
          centerX <
            compositionBounds.right &&
          centerY >
            compositionBounds.top &&
          centerY <
            compositionBounds.bottom;

        // Already safely outside
        if (
          !insideComposition
        ) {
          nextInactiveTargets[
            project.id
          ] = current;

          return;
        }

        // Direction away from composition
        let dx =
          centerX -
          compositionCenterX;

        let dy =
          centerY -
          compositionCenterY;

        if (
          Math.abs(dx) < 1 &&
          Math.abs(dy) < 1
        ) {
          dx = 1;
          dy = 0;
        }

        const distance =
          Math.hypot(
            dx,
            dy
          );

        dx /= distance;
        dy /= distance;

        let targetX =
          current.x;

        let targetY =
          current.y;

        let attempts = 0;

        while (
          attempts < 100 &&
          targetX <
            compositionBounds.right &&
          targetX +
            size.width >
            compositionBounds.left &&
          targetY <
            compositionBounds.bottom &&
          targetY +
            size.height >
            compositionBounds.top
        ) {
          targetX +=
            dx * 180;

          targetY +=
            dy * 180;

          attempts++;
        }

        // Avoid other projects
        attempts = 0;

        while (
          overlapsTarget(
            targetX,
            targetY,
            size.width,
            size.height
          ) &&
          attempts < 100
        ) {
          targetX +=
            dx * 180;

          targetY +=
            dy * 180;

          attempts++;
        }

        nextInactiveTargets[
          project.id
        ] = {
          x: targetX,
          y: targetY,
        };
      }
    );

    inactiveTargets.current =
      nextInactiveTargets;

    attractionPoint.current = {
      x: anchorX,
      y: anchorY,
    };

    setActiveClassification(
      section.id
    );
  };

  // --------------------------------------------------
  // PROJECT DRAGGING
  // --------------------------------------------------

  const handleProjectPointerDown =
    (
      e: PointerEvent<HTMLDivElement>,
      projectId: string
    ) => {
      // Active projects are locked.
      // Let the canvas receive the pointer
      // so it can pan.
      if (
        activeClassification &&
        projects.find(
          (project) =>
            project.id ===
              projectId &&
            project.classifications.includes(
              activeClassification
            )
        )
      ) {
        return;
      }

      // Unlocked projects are controlled
      // through their frames instead.
      if (
        unlockedProjects[
          projectId
        ]
      ) {
        return;
      }

      e.stopPropagation();

      const project =
        physicsPositions[
          projectId
        ] ??
        projectPositions[
          projectId
        ];

      if (!project) return;

      // Stop automatic movement
      delete activeTargets
        .current[projectId];

      delete inactiveTargets
        .current[projectId];

      projectDrag.current = {
        id: projectId,
        startX: e.clientX,
        startY: e.clientY,
        projectX: project.x,
        projectY: project.y,
      };

      e.currentTarget.setPointerCapture(
        e.pointerId
      );
    };

  const handleProjectPointerMove =
    (
      e: PointerEvent<HTMLDivElement>
    ) => {
      const drag =
        projectDrag.current;

      if (!drag) return;

      const scale =
        camera.current.scale;

      const dx =
        (e.clientX -
          drag.startX) /
        scale;

      const dy =
        (e.clientY -
          drag.startY) /
        scale;

      const nextPosition = {
        x:
          drag.projectX +
          dx,

        y:
          drag.projectY +
          dy,
      };

      setPhysicsPositions(
        (current) => ({
          ...current,
          [drag.id]:
            nextPosition,
        })
      );

      setProjectPositions(
        (current) => ({
          ...current,
          [drag.id]:
            nextPosition,
        })
      );
    };

  const handleProjectPointerUp =
    (
      e: PointerEvent<HTMLDivElement>
    ) => {
      projectDrag.current =
        null;

      if (
        e.currentTarget.hasPointerCapture(
          e.pointerId
        )
      ) {
        e.currentTarget.releasePointerCapture(
          e.pointerId
        );
      }
    };

  // --------------------------------------------------
  // FRAME INTRINSIC SIZING
  // --------------------------------------------------

  const handleImageLoad = (
  projectId: string,
  frameId: string,
  image: HTMLImageElement
) => {
  const key = `${projectId}:${frameId}`;

  // If this frame already has a saved size,
  // do not overwrite it with intrinsic sizing.
  if (frameSizes[key]) {
    return;
  }

  const naturalWidth =
    image.naturalWidth;

  const naturalHeight =
    image.naturalHeight;

  if (
    !naturalWidth ||
    !naturalHeight
  ) {
    return;
  }

  const maxWidth = 600;
  const maxHeight = 500;

  const scale = Math.min(
    maxWidth / naturalWidth,
    maxHeight / naturalHeight,
    1
  );

  setFrameSizes(
    (current) => {
      // Protect against the image load
      // racing with a saved size.
      if (current[key]) {
        return current;
      }

      return {
        ...current,
        [key]: {
          width:
            naturalWidth * scale,
          height:
            naturalHeight * scale,
        },
      };
    }
  );
};

  const handleVideoMetadata = (
  projectId: string,
  frameId: string,
  video: HTMLVideoElement
) => {
  const key = `${projectId}:${frameId}`;

  // If this frame already has a saved size,
  // do not overwrite it with intrinsic sizing.
  if (frameSizes[key]) {
    return;
  }

  const naturalWidth =
    video.videoWidth;

  const naturalHeight =
    video.videoHeight;

  if (
    !naturalWidth ||
    !naturalHeight
  ) {
    return;
  }

  const maxWidth = 600;
  const maxHeight = 500;

  const scale = Math.min(
    maxWidth / naturalWidth,
    maxHeight / naturalHeight,
    1
  );

  setFrameSizes(
    (current) => {
      if (current[key]) {
        return current;
      }

      return {
        ...current,
        [key]: {
          width:
            naturalWidth * scale,
          height:
            naturalHeight * scale,
        },
      };
    }
  );
};

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#f7f7f5] text-[#111]">

      {/* HEADER */}

      <header className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex items-center justify-between p-6">

        <div className="pointer-events-auto text-sm font-medium">
          MATHEW YAMIN
        </div>

        <nav className="pointer-events-auto hidden items-center gap-5 rounded-full bg-white/80 px-5 py-3 text-xs backdrop-blur-md md:flex">

          <button
            onClick={
              resetView
            }
            className="transition-opacity hover:opacity-50"
          >
            ALL WORK
          </button>

          <button
  onClick={saveAllProjects}
  className="transition-opacity hover:opacity-50"
>
  SAVE
</button>

          {sections.map(
            (section) => (
              <button
                key={
                  section.id
                }
                onClick={() =>
                  goToSection(
                    section
                  )
                }
                className="transition-opacity hover:opacity-50"
              >
                {section.label.toUpperCase()}
              </button>
            )
          )}

        </nav>

        <div className="pointer-events-auto text-xs">
          2026
        </div>

      </header>

      {/* CANVAS VIEWPORT */}

      <div
        ref={
          viewportRef
        }
        className={`h-full w-full select-none touch-none ${
          dragging
            ? "cursor-grabbing"
            : "cursor-grab"
        }`}
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          handlePointerUp
        }
        onPointerCancel={
          handlePointerUp
        }
        onWheel={
          handleWheel
        }
      >

        {/* CANVAS */}

        <div
          ref={
            canvasRef
          }
          className="absolute left-0 top-0 will-change-transform"
          style={{
            transform:
              `translate3d(${INITIAL_CAMERA.x}px, ${INITIAL_CAMERA.y}px, 0) scale(${INITIAL_CAMERA.scale})`,
            transformOrigin:
              "0 0",
          }}
        >

          {/* INTRO */}

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
              A spatial archive of
              brand, product, web,
              campaigns, visual design
              and illustration.
            </p>

          </div>

          {/* PROJECTS */}

          {projects.map(
            (project) => {
              const position =
                physicsPositions[
                  project.id
                ] ??
                projectPositions[
                  project.id
                ] ??
                project.position;

              const projectSize =
                getProjectSize(
                  project,
                  frameSizes,
                  framePositions
                );

              const projectWidth =
                projectSize.width;

              const projectHeight =
                projectSize.height;

              return (
                <div
                  key={
                    project.id
                  }
                  className="absolute cursor-grab active:cursor-grabbing"
                  style={{
                    left:
                      position.x,

                    top:
                      position.y,
                  }}
                  onPointerDown={(
                    e
                  ) =>
                    handleProjectPointerDown(
                      e,
                      project.id
                    )
                  }
                  onPointerMove={
                    handleProjectPointerMove
                  }
                  onPointerUp={
                    handleProjectPointerUp
                  }
                  onPointerCancel={
                    handleProjectPointerUp
                  }
                >

                  {/* PROJECT HEADER */}

                  <div className="mb-4 flex items-center justify-between gap-4">
  <div className="flex items-center gap-2">
    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/70">
      {project.title}
    </span>

    <span className="text-[9px] text-black/30">
      {project.year}
    </span>

    {project.classifications.map(
      (classification) => (
        <span
          key={classification}
          className="text-[8px] uppercase tracking-[0.12em] text-black/30"
        >
          {classification}
        </span>
      )
    )}
  </div>

  <div className="flex items-center gap-1">
    

    <button
      type="button"
      onPointerDown={(e) =>
        e.stopPropagation()
      }
      onClick={(e) => {
        e.stopPropagation();
        toggleProjectLock(project.id);
      }}
      className="rounded-full border border-black/10 bg-white/80 px-2.5 py-1 text-[8px] uppercase tracking-[0.12em] text-black/50 transition-colors hover:bg-black hover:text-white"
    >
      {unlockedProjects[project.id]
        ? "Lock"
        : "Edit"}
    </button>
  </div>
</div>

                  {/* PROJECT BOUNDARY */}

                  <div
                    className="relative rounded-[2rem] border border-black/10 bg-white/60"
                    style={{
                      width:
                        projectWidth,

                      height:
                        projectHeight,
                    }}
                  >

                    {/* PROJECT FRAMES */}

{project.frames.map((frame) => {
  const frameKey =
    `${project.id}:${frame.id}`;

  const framePosition =
    framePositions[frameKey] ??
    frame.position;

  const frameSize =
  frameSizes[frameKey] ??
  (frame.width && frame.height
    ? {
        width: frame.width,
        height: frame.height,
      }
    : {
        width: 420,
        height: 300,
      });

  const isUnlocked =
    unlockedProjects[project.id];

  return (
    <div
      key={frame.id}
      className={`absolute ${
        isUnlocked
          ? "cursor-move"
          : ""
      }`}
      style={{
        left: framePosition.x,
        top: framePosition.y,
      }}
      onPointerDown={(e) =>
        handleFramePointerDown(
          e,
          project.id,
          frame.id
        )
      }
      onPointerMove={
        handleFramePointerMove
      }
      onPointerUp={
        handleFramePointerUp
      }
      onPointerCancel={
        handleFramePointerUp
      }
    >
      {/* FRAME LABEL */}

      <div
        className="mb-2 text-[9px] uppercase tracking-[0.16em] text-black/35"
        onPointerDown={(e) =>
          e.stopPropagation()
        }
      >
        {frame.title}
      </div>

      {/* FRAME / MEDIA */}

<div
  className="relative w-fit"
  style={{
    width: frameSize.width,
  }}
>
  {frame.type === "video" ? (
    <video
      src={frame.src}
      className="block h-auto w-full rounded-xl"
      muted
      loop
      autoPlay
      playsInline
      onLoadedMetadata={(e) =>
        handleVideoMetadata(
          project.id,
          frame.id,
          e.currentTarget
        )
      }
    />
  ) : (
    <img
      src={frame.src}
      alt={frame.title}
      className="block h-auto w-full rounded-xl"
      draggable={false}
      onLoad={(e) =>
        handleImageLoad(
          project.id,
          frame.id,
          e.currentTarget
        )
      }
    />
  )}

  {/* RESIZE HANDLE */}

  {isUnlocked && (
    <div
      className="absolute bottom-[-4px] right-[-4px] z-20 h-5 w-5 cursor-se-resize rounded-sm border border-black/20 bg-white/95 shadow-sm"
      style={{
        touchAction: "none",
      }}
      onPointerDown={(e) => {
        e.stopPropagation();

        handleFrameResizePointerDown(
          e,
          project.id,
          frame.id
        );
      }}
      onPointerMove={
        handleFrameResizePointerMove
      }
      onPointerUp={
        handleFrameResizePointerUp
      }
      onPointerCancel={
        handleFrameResizePointerUp
      }
      aria-label={`Resize ${frame.title}`}
    />
  )}
</div>
    </div>
  );
})}

                  </div>

                </div>
              );
            }
          )}

        </div>

      </div>

      {/* ZOOM CONTROLS */}

      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1 rounded-full bg-white/90 p-1 shadow-sm backdrop-blur-md">

        <button
          onClick={() =>
            zoom(-0.1)
          }
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"
        >
          −
        </button>

        <button
          onClick={
            resetView
          }
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs hover:bg-black/5"
        >
          ⌖
        </button>

        <button
          onClick={() =>
            zoom(0.1)
          }
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5"
        >
          +
        </button>

      </div>

      {/* MINIMAP */}

      <div className="fixed bottom-6 left-6 z-50 hidden h-28 w-44 overflow-hidden rounded-xl border border-black/10 bg-white/70 p-2 backdrop-blur-md md:block">

        <div className="relative h-full w-full">

          {projects.map(
            (project) => {
              const position =
                physicsPositions[
                  project.id
                ] ??
                projectPositions[
                  project.id
                ] ??
                project.position;

              return (
                <div
                  key={
                    project.id
                  }
                  className="absolute h-6 w-10 rounded bg-black/10"
                  style={{
                    left:
                      position.x /
                      25,

                    top:
                      position.y /
                      25,
                  }}
                />
              );
            }
          )}

          <div className="absolute left-2 top-2 h-16 w-24 rounded border border-black/60" />

        </div>

      </div>

    </main>
  );
}