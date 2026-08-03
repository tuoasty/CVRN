import { Suspense } from "react";
import { notFound } from "next/navigation";
import SeasonLeaderboardPage from "@/app/features/leaderboard/SeasonLeaderboardPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedPlayerLeaderboard,
    getCachedLeaderboardIdentity,
} from "@/server/cache/publicReads";
import {joinLeaderboardIdentity} from "@/app/features/leaderboard/joinLeaderboardIdentity";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";
import { logger } from "@/server/utils/logger";

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

    const [statRows, identity] = await Promise.all([
        getCachedPlayerLeaderboard(seasonRecord.id),
        getCachedLeaderboardIdentity(),
    ]);

    return (
        <Suspense fallback={null}>
            <SeasonLeaderboardPage
                rows={joinLeaderboardIdentity(statRows, identity)}
                season={seasonRecord}
                region={regionRecord}
            />
        </Suspense>
    );
}
