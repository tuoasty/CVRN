import { notFound } from "next/navigation";
import PublicTeamDetailPage from "@/app/(public)/teams/[region]/[season]/[teamName]/PublicTeamDetailPage";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
    getCachedTeamWithPlayers,
    getCachedTeamNameHistory,
    getCachedTeamLeaderboard,
    getCachedTeamMatches,
    getCachedStandings,
    getCachedTeamStrengths,
    getCachedAllSeasonRows,
} from "@/server/cache/publicReads";
import { safeDecodeURIComponent } from "@/app/utils/decodeURI";
import { seasonStrengths } from "@/app/features/teams/model/strength";
import { buildRosterTiles } from "@/app/features/teams/detail/model/roster";
import type { PlayerLeaderboardRow } from "@/server/domains/player";
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

    const [history, statRows, matchHistory, standings, strengths, allRows] = await Promise.all([
        getCachedTeamNameHistory(teamData.team.id),
        getCachedTeamLeaderboard(teamData.team.id, seasonRecord.id),
        getCachedTeamMatches(teamData.team.id, seasonRecord.id),
        getCachedStandings(seasonRecord.id, regionRecord.id),
        getCachedTeamStrengths(seasonRecord.season_number),
        getCachedAllSeasonRows(),
    ]);

    const seasonTeamIds = standings.map((s) => s.team_id).filter((id): id is string => !!id);
    if (!seasonTeamIds.includes(teamData.team.id)) seasonTeamIds.push(teamData.team.id);
    const strength = seasonStrengths(strengths, seasonRecord.id, seasonTeamIds).get(teamData.team.id) ?? {
        value: null,
        rank: null,
    };

    const rosterTiles = buildRosterTiles({
        players: teamData.players,
        rows: allRows as unknown as PlayerLeaderboardRow[],
        seasonId: seasonRecord.id,
        regionId: regionRecord.id,
    });

    return (
        <PublicTeamDetailPage
            team={teamData.team}
            rosterTiles={rosterTiles}
            history={history}
            statRows={statRows}
            matches={matchHistory.matches}
            matchTeams={matchHistory.teams}
            regionCode={regionCode}
            seasonSlug={seasonSlug}
            standingMethod={regionRecord.standing_method as StandingMethod}
            standing={standings.find((s) => s.team_id === teamData.team.id) ?? null}
            teamCount={standings.filter((s) => !!s.team_id).length}
            strength={strength}
        />
    );
}
