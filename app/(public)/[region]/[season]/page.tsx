import { notFound } from "next/navigation";
import HomePage from "@/app/(public)/home/HomePage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedTeamsWithRegionsIncludingInactive,
    getCachedUpcomingMatches,
    getCachedRecentMatches,
    getCachedSeasonPodium,
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

    const isSeasonCompleted = seasonRecord.end_date
        ? new Date(seasonRecord.end_date) < new Date()
        : false;

    const [teams, podium, mediaPosts, articles] = await Promise.all([
        getCachedTeamsWithRegionsIncludingInactive(),
        isSeasonCompleted
            ? getCachedSeasonPodium(seasonRecord.id)
            : Promise.resolve([]),
        getCachedAllMediaPosts(),
        getCachedPublishedArticles(),
    ]);

    const [upcomingMatches, recentMatches] = await Promise.all([
        getCachedUpcomingMatches(seasonRecord.id),
        getCachedRecentMatches(seasonRecord.id),
    ]);

    return (
        <HomePage
            teams={teams}
            upcomingMatches={upcomingMatches}
            recentMatches={recentMatches}
            podium={podium}
            mediaPosts={mediaPosts}
            articles={articles}
        />
    );
}
