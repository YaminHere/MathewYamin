
import Link from 'next/link'
import { getProjects } from '../utils'
import { ProjectsList } from './projects-list'

export default async function ProjectsPage() {
    const projects = await getProjects()
    // Show newest projects first
    const sortedProjects = [...projects].reverse()

    return (
        <main className="space-y-12">
            <section>
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                        All Projects
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
