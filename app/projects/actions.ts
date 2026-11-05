'use server'

import { getR2Project, saveR2Project } from '@/lib/r2'

export async function toggleHomepageFeatured(
    projectId: string,
    featured: boolean
) {
    const project = await getR2Project(projectId)

    if (!project) {
        throw new Error('Project not found')
    }

    project.homepage = {
        ...(project.homepage ?? {}),
        featured,
    }

    await saveR2Project(project)
}