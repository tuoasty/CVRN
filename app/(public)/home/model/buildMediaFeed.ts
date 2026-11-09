import type {MediaPost} from "@/server/domains/media";
import {getYoutubeId} from "@/shared/utils/youtube";

export function buildMediaFeed(posts: MediaPost[], excludeIds: Set<string>, limit = 12): MediaPost[] {
    const visible = posts.filter(p =>
        p.type !== "article" &&
        p.type !== "clip" &&
        !excludeIds.has(p.id) &&
        (!!p.image_url || (!!p.video_url && !!getYoutubeId(p.video_url))),
    );
    const pinned = visible
        .filter(p => p.is_pinned)
        .sort((a, b) => (b.pinned_at ?? "").localeCompare(a.pinned_at ?? ""));
    const rest = visible
        .filter(p => !p.is_pinned)
        .sort((a, b) => b.published_at.localeCompare(a.published_at));
    return [...pinned, ...rest].slice(0, limit);
}
