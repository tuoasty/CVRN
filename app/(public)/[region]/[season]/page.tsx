import { notFound } from "next/navigation";
import HomePage from "@/app/(public)/home/HomePage";
import { buildHomeView, peopleIdsFor, statMatchIdsFor, type HomePerson } from "@/app/(public)/home/buildHomeView";
import { getSeasonPhase } from "@/app/(public)/home/model/phase";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedTeamsWithRegionsIncludingInactive,
    getCachedSeasonUpcomingMatches,
    getCachedSeasonCompletedMatches,
    getCachedSeasonPodium,
    getCachedSeasonAwards,
    getCachedAllMediaPosts,
    getCachedPublishedArticles,
    getCachedStandings,
    getCachedPlayerLeaderboard,
    getCachedLeaderboardIdentity,
    getCachedSeasons,
    getCachedRegions,
    getCachedMatchStatTotals,
    getCachedPlayersByIds,
    playerIdsCacheKey,
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

    const now = new Date();
    const isCompleted = getSeasonPhase(seasonRecord, now) === "completed";

    const [teams, upcoming, completed, posts, standings, leaderRows, identity, podium, awards, seasons, regions, articles] =
        await Promise.all([
            getCachedTeamsWithRegionsIncludingInactive(),
            getCachedSeasonUpcomingMatches(seasonRecord.id),
            getCachedSeasonCompletedMatches(seasonRecord.id),
            getCachedAllMediaPosts(),
            getCachedStandings(seasonRecord.id, regionRecord.id),
            getCachedPlayerLeaderboard(seasonRecord.id),
            getCachedLeaderboardIdentity(),
            isCompleted ? getCachedSeasonPodium(seasonRecord.id) : Promise.resolve([]),
            isCompleted ? getCachedSeasonAwards(seasonRecord.id) : Promise.resolve([]),
            getCachedSeasons(),
            getCachedRegions(),
            getCachedPublishedArticles(),
        ]);

    const [matchTotals, players] = await Promise.all([
        getCachedMatchStatTotals(playerIdsCacheKey(statMatchIdsFor(completed, posts, seasonRecord.id))),
        getCachedPlayersByIds(playerIdsCacheKey(peopleIdsFor(posts, seasonRecord.id))),
    ]);

    const people = new Map<string, HomePerson>(
        players.map(p => [p.id, { name: p.display_name || p.username, username: p.username, avatarUrl: p.avatar_url }]),
    );

    const view = buildHomeView({
        now,
        region: regionRecord,
        season: seasonRecord,
        teams,
        upcoming,
        completed,
        posts,
        standings,
        leaderRows,
        identity,
        matchTotals,
        podium,
        awards,
        seasons,
        regions,
        articles,
        people,
    });

    return <HomePage view={view} seasonLabel={seasonRecord.name} />;
}
