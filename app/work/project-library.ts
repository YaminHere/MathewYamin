import { listR2Projects } from "@/lib/r2";

export type CanvasFrame = {
    id: string;
    title: string;
    type: "image" | "video" | "gif" | "pdf";
    src: string;
    poster?: string;
    posterStorageKey?: string;
    position: {
        x: number;
        y: number;
    };
    width?: number;
    height?: number;
    zIndex?: number;
};

export type CanvasThumbnail = {
    type: "image" | "video" | "gif";
    src: string;
    storageKey?: string;
    width?: number;
    height?: number;
};

export type CanvasProject = {
    id: string;
    title: string;
    year: number;
    classifications: string[];
    description?: string;
    position: {
        x: number;
        y: number;
    };
    scale?: number;
    homepage?: {
        featured?: boolean;
        description?: string;
        frameId?: string;
    };
    thumbnail?: CanvasThumbnail;
    frames: CanvasFrame[];
};

export async function getCanvasProjects(): Promise<CanvasProject[]> {
    const projects = await listR2Projects();

    return projects as CanvasProject[];
}