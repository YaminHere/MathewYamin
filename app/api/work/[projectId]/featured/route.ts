import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import fs from 'fs/promises'
import path from 'path'

type RouteContext = {
    params: Promise<{
        projectId: string
    }>
}

export async function PATCH(
    request: Request,
    { params }: RouteContext
) {
    const session = await auth()

    if (!session?.user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

    const { projectId } = await params

    if (!projectId) {
        return NextResponse.json(
            { error: 'Missing project ID' },
            { status: 400 }
        )
    }

    let body: {
        featured?: unknown
    }

    try {
        body = await request.json()
    } catch {
        return NextResponse.json(
            { error: 'Invalid request body' },
            { status: 400 }
        )
    }

    if (typeof body.featured !== 'boolean') {
        return NextResponse.json(
            {
                error:
                    'Featured value must be a boolean',
            },
            { status: 400 }
        )
    }

    const workPath = path.join(
        process.cwd(),
        'public',
        'work'
    )

    const projectPath = path.join(
        workPath,
        projectId,
        'project.json'
    )

    // Prevent path traversal.
    const resolvedWorkPath = path.resolve(workPath)
    const resolvedProjectPath =
        path.resolve(projectPath)

    if (
        !resolvedProjectPath.startsWith(
            `${resolvedWorkPath}${path.sep}`
        )
    ) {
        return NextResponse.json(
            { error: 'Invalid project ID' },
            { status: 400 }
        )
    }

    try {
        const fileContent = await fs.readFile(
            resolvedProjectPath,
            'utf-8'
        )

        const project = JSON.parse(fileContent)

        project.homepage ??= {}

        project.homepage.featured =
            body.featured

        await fs.writeFile(
            resolvedProjectPath,
            JSON.stringify(project, null, 2) + '\n',
            'utf-8'
        )

        return NextResponse.json({
            success: true,
            featured:
                project.homepage.featured,
        })
    } catch (error) {
        console.error(
            'Failed to update project selection:',
            error
        )

        return NextResponse.json(
            {
                error:
                    'Failed to update project selection',
            },
            { status: 500 }
        )
    }
}