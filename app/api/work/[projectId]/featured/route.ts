import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    getR2Project,
    saveR2Project,
} from "@/lib/r2";

type RouteContext = {
    params: Promise<{
        projectId: string;
    }>;
};

export async function PATCH(
    request: Request,
    { params }: RouteContext
) {
    const session = await auth();

    if (session?.user?.id !== "admin") {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const { projectId } = await params;

    if (
        !projectId ||
        !/^[a-zA-Z0-9_-]+$/.test(projectId)
    ) {
        return NextResponse.json(
            { error: "Invalid project ID" },
            { status: 400 }
        );
    }

    let body: {
        featured?: unknown;
    };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
        );
    }

    if (typeof body.featured !== "boolean") {
        return NextResponse.json(
            {
                error: "Featured value must be a boolean",
            },
            { status: 400 }
        );
    }

    try {
        const project = await getR2Project(projectId);

        if (!project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            );
        }

        project.homepage ??= {};
        project.homepage.featured = body.featured;

        await saveR2Project(project);

        return NextResponse.json({
            success: true,
            featured: project.homepage.featured,
        });
    } catch (error) {
        console.error(
            "Failed to update project selection:",
            error
        );

        return NextResponse.json(
            {
                error: "Failed to update project selection",
            },
            { status: 500 }
        );
    }
}