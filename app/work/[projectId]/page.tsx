import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'

import { getCanvasProjects } from '../project-library'
import { EditableDescription } from './editable-description'
import { FavoriteButton } from './favorite-button'

type ProjectPageProps = {
    params: Promise<{
        projectId: string
    }>
}

export default async function ProjectPage({
    params,
}: ProjectPageProps) {
    const { projectId } = await params

    const [projects, session] = await Promise.all([
        getCanvasProjects(),
        auth(),
    ])

    const project = projects.find(
        (item) => item.id === projectId
    )

    if (!project) {
        notFound()
    }

    const isAdmin = !!session?.user

    /*
     * New project description takes priority.
     *
     * homepage.description remains as a fallback
     * for projects that haven't been migrated yet.
     */
    const description =
        project.description ??
        project.homepage?.description

    return (
        <main className="min-h-screen bg-[#f7f7f5] text-[#111] dark:bg-zinc-950 dark:text-white">
            <header className="sticky top-0 z-50 flex items-center justify-between border-b border-black/5 bg-[#f7f7f5]/80 px-6 py-5 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/80">
                <Link
                    href="/work"
                    className="text-sm font-medium transition-opacity hover:opacity-50"
                >
                    MATHEW YAMIN
                </Link>

                <Link
                    href="/work"
                    className="text-xs uppercase tracking-[0.12em] text-black/40 transition-opacity hover:text-black dark:text-white/40 dark:hover:text-white"
                >
                    Back to work
                </Link>
            </header>

            <section className="mx-auto max-w-5xl px-6 pb-20 pt-24">
                <div className="mb-6 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.14em] text-black/35 dark:text-white/35">
                    <span>{project.year}</span>

                    <span>•</span>

                    {project.classifications.map(
                        (classification) => (
                            <span key={classification}>
                                {classification}
                            </span>
                        )
                    )}
                </div>

                <h1 className="max-w-4xl text-5xl font-medium tracking-tight md:text-7xl">
                    {project.title}
                </h1>

                <EditableDescription
                    projectId={project.id}
                    initialDescription={description}
                    isAdmin={isAdmin}
                />
                
                <div className="mt-4">
    <FavoriteButton
        projectId={project.id}
        initialFeatured={
            project.homepage?.featured === true
        }
        isAdmin={isAdmin}
    />
</div>
            </section>

            <section className="mx-auto max-w-6xl px-6 pb-32">
                <div className="space-y-8">
                    {project.frames.map((frame) => (
                        <ProjectFrame
                            key={frame.id}
                            frame={frame}
                        />
                    ))}
                </div>
            </section>
        </main>
    )
}

function ProjectFrame({
    frame,
}: {
    frame: {
        id: string
        title: string
        type:
            | 'image'
            | 'video'
            | 'gif'
            | 'pdf'
        src: string
    }
}) {
    if (frame.type === 'video') {
        return (
            <video
                src={frame.src}
                autoPlay
                loop
                muted
                playsInline
                controls
                className="w-full rounded-2xl"
            />
        )
    }

    if (frame.type === 'pdf') {
        return (
            <iframe
                src={frame.src}
                title={frame.title}
                className="h-[80vh] w-full rounded-2xl border border-black/10 dark:border-white/10"
            />
        )
    }

    return (
        <img
            src={frame.src}
            alt={frame.title}
            className="w-full rounded-2xl"
        />
    )
}