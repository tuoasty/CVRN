import { notFound } from "next/navigation";
import PublicTeamDetailPage from "@/app/(public)/teams/[region]/[season]/[teamName]/PublicTeamDetailPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedTeamWithPlayers,
    getCachedTeamNameHistory,
    getCachedTeamLeaderboard,
    getCachedTeamMatches,
} from "@/server/cache/publicReads";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";
import type { StandingMethod } from "@/shared/types/standing";

type PageProps = {
    params: Promise<{
        region: string;
        season: string;
        teamName: string;
    }>;
};

export async function generateStaticParams() {
    return [];
}

export default async function TeamPage({ params }: PageProps) {
    const { region, season, teamName } = await params;

    const regionCode = safeDecodeURIComponent(region).toLowerCase();
    const seasonSlug = safeDecodeURIComponent(season).toLowerCase();
    const teamSlug = safeDecodeURIComponent(teamName).toLowerCase();

    const regionRecord = await getCachedRegionByCode(regionCode);
    if (!regionRecord) notFound();

    const seasonRecord = await getCachedSeasonBySlugAndRegion(seasonSlug, regionRecord.id);
    if (!seasonRecord) notFound();

    const teamData = await getCachedTeamWithPlayers(teamSlug, seasonRecord.id);
    if (!teamData) notFound();

    const [history, statRows, matchHistory] = await Promise.all([
        getCachedTeamNameHistory(teamData.team.id),
        getCachedTeamLeaderboard(teamData.team.id, seasonRecord.id),
        getCachedTeamMatches(teamData.team.id, seasonRecord.id),
    ]);

    return (
        <PublicTeamDetailPage
            team={teamData.team}
            players={teamData.players}
            history={history}
            statRows={statRows}
            matches={matchHistory.matches}
            matchTeams={matchHistory.teams}
            regionCode={regionCode}
            seasonSlug={seasonSlug}
            standingMethod={regionRecord.standing_method as StandingMethod}
        />
    );
}
