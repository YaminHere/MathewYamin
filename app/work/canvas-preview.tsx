'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { CanvasProject } from './project-library'

export function CanvasPreview({
    projects,
}: {
    projects: CanvasProject[]
}) {
    const projectRefs =
        useRef<Record<string, HTMLDivElement | null>>({})

    useEffect(() => {
        if (!projects.length) return

        let animationFrame: number
        const start = performance.now()

        const animate = (now: number) => {
            const time = (now - start) / 1000

            projects.forEach((project, index) => {
                const element =
                    projectRefs.current[project.id]

                if (!element) return

                const offset = index * 1.73

                const speed =
                    0.22 + (index % 4) * 0.035

                const x =
                    Math.sin(
                        time * speed + offset
                    ) *
                    (18 + (index % 3) * 5)

                const y =
                    Math.cos(
                        time * speed * 0.72 +
                            offset
                    ) *
                    (14 + (index % 4) * 4)

                const rotation =
                    Math.sin(
                        time * speed * 0.55 +
                            offset
                    ) * 1

                element.style.transform =
                    `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`
            })

            animationFrame =
                requestAnimationFrame(animate)
        }

        animationFrame =
            requestAnimationFrame(animate)

        return () => {
            cancelAnimationFrame(animationFrame)
        }
    }, [projects])

    if (!projects.length) {
        return null
    }

    const positions = projects.map((project) => ({
        project,
        x: project.position.x,
        y: project.position.y,
    }))

    const minX = Math.min(
        ...positions.map((item) => item.x)
    )

    const minY = Math.min(
        ...positions.map((item) => item.y)
    )

    const maxX = Math.max(
        ...positions.map((item) => item.x)
    )

    const maxY = Math.max(
        ...positions.map((item) => item.y)
    )

    const previewWidth = 1100
    const previewHeight = 520
    const padding = 80

    const sourceWidth = Math.max(
        maxX - minX,
        1
    )

    const sourceHeight = Math.max(
        maxY - minY,
        1
    )

    const scaleX =
        (previewWidth - padding * 2) /
        sourceWidth

    const scaleY =
        (previewHeight - padding * 2) /
        sourceHeight

    const previewScale = Math.min(
        scaleX,
        scaleY,
        0.75
    )

    return (
        <Link
            href="/work"
            className="group block overflow-hidden rounded-2xl border border-zinc-200/70 bg-zinc-50 dark:border-zinc-800/70 dark:bg-zinc-950"
        >
            <div className="relative h-[420px] overflow-hidden">
                <div
                    className="absolute"
                    style={{
                        width: previewWidth,
                        height: previewHeight,
                        left: `calc(50% - ${
                            previewWidth / 2
                        }px)`,
                        top: `calc(50% - ${
                            previewHeight / 2
                        }px)`,
                    }}
                >
                    {positions.map(
                        ({
                            project,
                            x: sourceX,
                            y: sourceY,
                        }) => {
                            const frame =
                                project.frames?.[0]

                            if (!frame) {
                                return null
                            }

                            const baseX =
                                (sourceX - minX) *
                                    previewScale +
                                padding

                            const baseY =
                                (sourceY - minY) *
                                    previewScale +
                                padding

                            return (
                                <div
                                    key={project.id}
                                    ref={(element) => {
                                        projectRefs.current[
                                            project.id
                                        ] = element
                                    }}
                                    className="absolute w-[220px] overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm transition-shadow duration-500 group-hover:shadow-md dark:border-white/10 dark:bg-zinc-900"
                                    style={{
                                        left: baseX,
                                        top: baseY,
                                        willChange:
                                            'transform',
                                    }}
                                >
                                    {frame.type ===
                                    'video' ? (
                                        <video
                                            src={
                                                frame.src
                                            }
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            className="aspect-video w-full object-cover"
                                        />
                                    ) : (
                                        <img
                                            src={
                                                frame.src
                                            }
                                            alt=""
                                            className="aspect-video w-full object-cover"
                                        />
                                    )}

                                    <div className="px-2 py-1.5">
                                        <p className="truncate text-[8px] uppercase tracking-[0.1em] text-black/40 dark:text-white/40">
                                            {
                                                project.title
                                            }
                                        </p>
                                    </div>
                                </div>
                            )
                        }
                    )}
                </div>

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="pointer-events-none absolute bottom-5 right-5 rounded-full bg-black px-3 py-1.5 text-[9px] uppercase tracking-[0.12em] text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    Explore full portfolio ↗
                </div>
            </div>
        </Link>
    )
}