import Link from 'next/link'
import { getCanvasProjects } from '../work/project-library'
import { ProjectsList } from './(list)/projects-list'

export default async function ProjectsPage() {
    const projects = await getCanvasProjects()

    const selectedProjects = projects.filter(
        (project) =>
            project.homepage?.featured === true
    )

    const sortedProjects = [...selectedProjects].reverse()

    return (
        <main className="space-y-12">
            <section>
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Selected Projects
                    </h1>

                    <Link
                        href="/"
                        className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                        Back to home
                    </Link>
                </div>

                <ProjectsList projects={sortedProjects} />
            </section>
        </main>
    )
}