import type {AccessGroup} from "@/shared/types/accessGroup";
import type {MediaPostType} from "@/server/domains/media/types";

const ALL_MEDIA_TYPES: MediaPostType[] = ["gfx", "video", "news", "recap", "clip", "totw", "potw", "article", "champion", "feature"];

const GROUP_MEDIA_TYPES: Partial<Record<AccessGroup, readonly MediaPostType[]>> = {
    graphics: ["gfx", "totw", "potw", "champion", "feature"],
    media: ["video"],
};

export function allowedMediaTypes(groups: readonly AccessGroup[]): MediaPostType[] {
    if (groups.includes("super_admin") || groups.includes("admin")) return [...ALL_MEDIA_TYPES];
    return ALL_MEDIA_TYPES.filter(type => groups.some(group => GROUP_MEDIA_TYPES[group]?.includes(type)));
}

export function canWriteMediaType(groups: readonly AccessGroup[], type: string): boolean {
    return (allowedMediaTypes(groups) as string[]).includes(type);
}
