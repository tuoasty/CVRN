import {getCacheVersion} from "@/server/cache/version";
import {ALL_CACHE_TAGS, type CacheTag} from "@/server/cache/tags";

export const dynamic = "force-dynamic";

function isCacheTag(value: string): value is CacheTag {
    return (ALL_CACHE_TAGS as string[]).includes(value);
}

export async function GET(request: Request) {
    const requested = new URL(request.url).searchParams.get("tags");
    const tags = (requested ? requested.split(",") : []).map(t => t.trim()).filter(isCacheTag);

    const entries = await Promise.all(
        tags.map(async tag => [tag, await getCacheVersion(tag)] as const),
    );

    return Response.json(Object.fromEntries(entries), {
        headers: {"Cache-Control": "no-store"},
    });
}
