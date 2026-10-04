import { getCanvasProjects } from './work/project-library'
import { HomeContent } from './home-content'

export default async function Personal() {
    const projects = await getCanvasProjects()

    const selectedProjects = projects.filter(
        (project) =>
            project.homepage?.featured === true
    )

    return (
        <HomeContent
            projects={selectedProjects}
            allProjects={projects}
        />
    )
}