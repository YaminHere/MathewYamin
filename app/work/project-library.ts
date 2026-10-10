import fs from 'fs/promises'
import path from 'path'

export type CanvasFrame = {
    id: string
    title: string
    type: 'image' | 'video' | 'gif' | 'pdf'
    src: string
    position: {
        x: number
        y: number
    }
    width?: number
    height?: number
    zIndex?: number
}

export type CanvasProject = {
    id: string
    title: string
    year: number
    classifications: string[]
    description?: string
    position: {
        x: number
        y: number
    }   
    scale?: number
    homepage?: {
        featured?: boolean
        description?: string
        frameId?: string
    }
    frames: CanvasFrame[]
}

export async function getCanvasProjects(): Promise<CanvasProject[]> {
    const workPath = path.join(
        process.cwd(),
        'public',
        'work'
    )

    const entries = await fs.readdir(workPath, {
        withFileTypes: true,
    })

    const projectIds = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)

    const projects = await Promise.all(
        projectIds.map(async (projectId) => {
            const projectPath = path.join(
                workPath,
                projectId,
                'project.json'
            )

            try {
                const fileContent = await fs.readFile(
                    projectPath,
                    'utf-8'
                )

                return JSON.parse(fileContent) as CanvasProject
            } catch (error) {
                console.warn(
                    `Failed to read canvas project: ${projectId}`,
                    error
                )

                return null
            }
        })
    )

    return projects.filter(
        (project): project is CanvasProject =>
            project !== null
    )
}