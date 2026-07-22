import { notFound } from "next/navigation";
import MediaPage from "@/app/(public)/media/MediaPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedAllMediaPosts,
} from "@/server/cache/publicReads";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";

type PageProps = {
    params: Promise<{ region: string; season: string }>;
};

/**
 * Media posts are fetched once on the server and filtered, searched and paged in the
 * browser. Previously each of those was a server-action POST — one per tab click, one per
 * page click, and one per debounced keystroke.
 *
 * `getCachedAllMediaPosts()` is the same cache entry the season home page already reads,
 * so this adds no query and no new cache key, and the route stays statically rendered.
 *
 * If the media library ever grows large enough that shipping every post in the payload
 * hurts, the home page has the same problem first — it passes this identical unsliced list
 * to `HomePage`. Fix both together by paging on the server behind a searchParam.
 */
export default async function Page({ params }: PageProps) {
    const { region, season } = await params;

    const regionRecord = await getCachedRegionByCode(safeDecodeURIComponent(region).toLowerCase());
    if (!regionRecord) notFound();

    const seasonRecord = await getCachedSeasonBySlugAndRegion(
        safeDecodeURIComponent(season).toLowerCase(),
        regionRecord.id,
    );
    if (!seasonRecord) notFound();

    const posts = await getCachedAllMediaPosts();

    return <MediaPage posts={posts} />;
}
