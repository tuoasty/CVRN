import { Suspense } from "react";
import { notFound } from "next/navigation";
import SeasonLeaderboardPage from "@/app/features/leaderboard/SeasonLeaderboardPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedPlayerLeaderboard,
    getCachedLeaderboardIdentity,
} from "@/server/cache/publicReads";
import {getCacheVersion} from "@/server/cache/version";
import {CACHE_TAGS} from "@/server/cache/tags";
import {joinLeaderboardIdentity} from "@/app/features/leaderboard/joinLeaderboardIdentity";
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

    const [statRows, identity, statsVersion] = await Promise.all([
        getCachedPlayerLeaderboard(seasonRecord.id),
        getCachedLeaderboardIdentity(),
        getCacheVersion(CACHE_TAGS.stats),
    ]);

    return (
        <Suspense fallback={null}>
            <SeasonLeaderboardPage
                rows={joinLeaderboardIdentity(statRows, identity)}
                season={seasonRecord}
                region={regionRecord}
                statsVersion={statsVersion}
            />
        </Suspense>
    );
}
