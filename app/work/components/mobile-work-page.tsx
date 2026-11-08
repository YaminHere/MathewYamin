
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type MobileProject = {
  id: string;
  title: string;
  year: number;
  classifications: string[];
  thumbnail?: {
    type: "image" | "video" | "gif";
    src: string;
  };
  frames: {
    type: "image" | "video" | "gif" | "pdf";
    src: string;
  }[];
};

type MobileWorkPageProps = {
  projects: MobileProject[];
};

const categories = [
  { id: "all", label: "All" },
  { id: "brand", label: "Brand" },
  { id: "product", label: "Product" },
  { id: "web", label: "Web" },
  { id: "campaigns", label: "Campaigns" },
  { id: "visual", label: "Visual" },
  { id: "illustration", label: "Illustration" },
];

export default function MobileWorkPage({
  projects,
}: MobileWorkPageProps) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeIndex, setActiveIndex] = useState(0);

  const filteredProjects = useMemo(() => {
    if (activeCategory === "all") return projects;

    return projects.filter((project) =>
      project.classifications.some(
        (classification) =>
          classification.toLowerCase() === activeCategory
      )
    );
  }, [projects, activeCategory]);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setActiveIndex(0);
  };

  const mediaFor = (project: MobileProject) =>
    project.thumbnail?.src
      ? project.thumbnail
      : project.frames.find(
          (frame) => frame.src && frame.type !== "pdf"
        );

  return (
    <section className="fixed inset-x-0 bottom-0 top-16 flex flex-col overflow-hidden px-5 pb-5 pt-5 md:hidden">
      {/* INTRO */}
      <div className="mb-5 shrink-0">
        <div className="mb-2 flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-black/40 dark:text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          Independent designer · Kerala, India
        </div>

        <div className="flex items-end justify-between">
          <h1 className="text-[clamp(2.5rem,11vw,3.8rem)] font-medium leading-[0.88] tracking-[-0.075em]">
            Selected Work<span className="text-black/25 dark:text-white/25">.</span>
          </h1>

          <span className="pb-1 text-[10px] tabular-nums text-black/40 dark:text-white/40">
            {String(filteredProjects.length).padStart(2, "0")} WORKS
          </span>
        </div>
      </div>

      {/* CATEGORY FILTER */}
      <div className="mb-5 shrink-0 -mx-5 border-y border-black/10 px-5 py-3 dark:border-white/10">
        <div className="flex gap-5 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categories.map((category) => {
            const active = activeCategory === category.id;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategoryChange(category.id)}
                className={`shrink-0 text-[10px] uppercase tracking-[0.12em] transition-colors ${
                  active
                    ? "text-black dark:text-white"
                    : "text-black/35 dark:text-white/35"
                }`}
              >
                {category.label}
                {active && (
                  <span className="ml-1.5 inline-block h-1 w-1 rounded-full bg-current align-middle" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* HORIZONTAL PROJECT GALLERY */}
      <div className="min-h-0 flex-1">
        {filteredProjects.length > 0 ? (
          <div
            className="flex h-full snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={(event) => {
              const container = event.currentTarget;
              const firstCard = container.firstElementChild as HTMLElement | null;

              if (!firstCard) return;

              const cardStep =
                firstCard.getBoundingClientRect().width + 16;

              setActiveIndex(
                Math.min(
                  filteredProjects.length - 1,
                  Math.max(0, Math.round(container.scrollLeft / cardStep))
                )
              );
            }}
          >
            {filteredProjects.map((project) => {
              const media = mediaFor(project);
              const isVideo = media?.type === "video";

              return (
                <article
                  key={project.id}
                  className="flex h-full w-[86%] shrink-0 snap-start flex-col"
                >
                  <Link
                    href={`/work/${encodeURIComponent(project.id)}`}
                    className="group flex min-h-0 flex-1 flex-col"
                  >
                    <div className="relative min-h-0 flex-1 overflow-hidden bg-[#ecebe7] dark:bg-zinc-900">
                      {media?.src ? (
                        isVideo ? (
                          <video
                            src={media.src}
                            muted
                            loop
                            autoPlay
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <img
                            src={media.src}
                            alt={`${project.title} project`}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-contain transition-transform duration-500 group-active:scale-[1.02]"
                          />
                        )
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.15em] text-black/30 dark:text-white/30">
                          {project.title}
                        </div>
                      )}

                      <span className="absolute bottom-3 right-3 text-[9px] text-black/50 dark:text-white/50">
                        VIEW PROJECT ↗
                      </span>
                    </div>

                    <div className="flex shrink-0 items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <h2 className="text-[16px] font-medium tracking-[-0.04em]">
                          {project.title}
                        </h2>

                        <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-black/40 dark:text-white/40">
                          {project.classifications.join(" / ")}
                        </p>
                      </div>

                      <span className="shrink-0 pt-1 text-[10px] tabular-nums text-black/40 dark:text-white/40">
                        {project.year}
                      </span>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="flex h-full items-center justify-center text-xs text-black/40 dark:text-white/40">
            No projects in this category yet.
          </p>
        )}
      </div>

      {/* GALLERY PROGRESS */}
      {filteredProjects.length > 0 && (
        <div className="flex shrink-0 items-center justify-between pt-3">
          <span className="text-[9px] uppercase tracking-[0.15em] text-black/40 dark:text-white/40">
            Swipe to explore
          </span>

          <div className="flex items-center gap-3">
            <span className="text-[10px] tabular-nums text-black/50 dark:text-white/50">
              {String(activeIndex + 1).padStart(2, "0")} /{" "}
              {String(filteredProjects.length).padStart(2, "0")}
            </span>

            <div className="h-px w-12 bg-black/15 dark:bg-white/15">
              <div
                className="h-px bg-current transition-all"
                style={{
                  width: `${((activeIndex + 1) / filteredProjects.length) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
