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
        description?: unknown;
    };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Invalid request body" },
            { status: 400 }
        );
    }

    if (typeof body.description !== "string") {
        return NextResponse.json(
            { error: "Description must be a string" },
            { status: 400 }
        );
    }

    const description = body.description.trim();

    if (description.length > 5000) {
        return NextResponse.json(
            {
                error:
                    "Description is too long. Maximum 5000 characters.",
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

        project.description = description;

        await saveR2Project(project);

        return NextResponse.json({
            success: true,
            description,
        });
    } catch (error) {
        console.error(
            "Failed to update project description:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "Failed to update project description",
            },
            { status: 500 }
        );
    }
}