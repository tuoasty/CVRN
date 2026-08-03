import { Suspense } from "react";
import { notFound } from "next/navigation";
import SeasonLeaderboardPage from "@/app/features/leaderboard/SeasonLeaderboardPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedPlayerLeaderboard,
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

    const rows = await getCachedPlayerLeaderboard(seasonRecord.id);

    return (
        <Suspense fallback={null}>
            <SeasonLeaderboardPage rows={rows} season={seasonRecord} region={regionRecord} />
        </Suspense>
    );
}
