'use server'

import fs from 'fs/promises'
import path from 'path'

export async function toggleHomepageFeatured(
    projectId: string,
    featured: boolean
) {
    const projectPath = path.join(
        process.cwd(),
        'public',
        'work',
        projectId,
        'project.json'
    )

    const fileContent = await fs.readFile(
        projectPath,
        'utf-8'
    )

    const project = JSON.parse(fileContent)

    project.homepage = {
        ...(project.homepage ?? {}),
        featured,
    }

    await fs.writeFile(
        projectPath,
        JSON.stringify(project, null, 2) + '\n',
        'utf-8'
    )
}