import fs from 'fs'
import path from 'path'

export type ProjectData = {
    id: string
    name: string
    description: string
    video: string
    link: string
}

export async function getProjects(): Promise<ProjectData[]> {
    const projectsFile = path.join(process.cwd(), 'app/projects/projects.json')

    try {
        const fileContent = await fs.promises.readFile(projectsFile, 'utf-8')
        const projects = JSON.parse(fileContent)
        return projects
    } catch (error) {
        console.warn('Failed to read projects.json', error)
        return []
    }
}
