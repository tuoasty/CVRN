import { notFound } from "next/navigation";
import HomePage from "@/app/(public)/home/HomePage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedTeamsWithRegions,
    getCachedUpcomingMatches,
    getCachedRecentMatches,
    getCachedStandings,
    getCachedSeasonPodium,
    getCachedAllMediaPosts,
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

    const isSeasonCompleted = seasonRecord.end_date
        ? new Date(seasonRecord.end_date) < new Date()
        : false;

    // The limits (5 upcoming, 6 recent) mirror what HomePage previously requested via SWR.
    const [teams, upcomingMatches, recentMatches, standings, podium, mediaPosts] = await Promise.all([
        getCachedTeamsWithRegions(),
        getCachedUpcomingMatches(seasonRecord.id, 5),
        getCachedRecentMatches(seasonRecord.id, 6),
        getCachedStandings(seasonRecord.id, regionRecord.id),
        // Only completed seasons render a podium.
        isSeasonCompleted ? getCachedSeasonPodium(seasonRecord.id) : Promise.resolve([]),
        getCachedAllMediaPosts(),
    ]);

    return (
        <HomePage
            teams={teams}
            upcomingMatches={upcomingMatches}
            recentMatches={recentMatches}
            standings={standings}
            podium={podium}
            mediaPosts={mediaPosts}
        />
    );
}
