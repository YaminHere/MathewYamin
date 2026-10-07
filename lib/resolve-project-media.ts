type CloudinaryMedia = {
    assetId: string;
    publicId: string;
    displayName?: string;
    resourceType: string;
    format: string;
    width?: number;
    height?: number;
    url: string;
    createdAt: string;
};

type ProjectFrame = {
    id: string;
    title: string;
    type: "image" | "video" | "gif" | "pdf";
    src: string;
    position: {
        x: number;
        y: number;
    };
    width?: number;
    height?: number;
    zIndex?: number;
};

type Project = {
    id: string;
    title: string;
    year: number;
    classifications: string[];
    position: {
        x: number;
        y: number;
    };
    scale?: number;
    frames: ProjectFrame[];
};

export const resolveProjectMedia = (
    project: Project,
    media: CloudinaryMedia[]
): Project => {
    const mediaByAssetId = new Map(
        media.map((asset) => [
            asset.assetId,
            asset,
        ])
    );

    const frames = project.frames.map((frame) => {
        const asset = mediaByAssetId.get(frame.id);

        if (!asset) {
            return frame;
        }

        return {
            ...frame,
            src: asset.url,
        };
    });

    return {
        ...project,
        frames,
    };
};