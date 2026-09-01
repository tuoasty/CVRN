import { notFound } from "next/navigation";
import MediaPage from "@/app/(public)/media/MediaPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedAllMediaPosts,
    getCachedPublishedArticles,
} from "@/server/cache/publicReads";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";

type PageProps = {
    params: Promise<{ region: string; season: string }>;
};

export default async function Page({ params }: PageProps) {
    const { region, season } = await params;

    const regionRecord = await getCachedRegionByCode(safeDecodeURIComponent(region).toLowerCase());
    if (!regionRecord) notFound();

    const seasonRecord = await getCachedSeasonBySlugAndRegion(
        safeDecodeURIComponent(season).toLowerCase(),
        regionRecord.id,
    );
    if (!seasonRecord) notFound();

    const [posts, articles] = await Promise.all([
        getCachedAllMediaPosts(),
        getCachedPublishedArticles(),
    ]);

    return <MediaPage posts={posts} articles={articles} />;
}
