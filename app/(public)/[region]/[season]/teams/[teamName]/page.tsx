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
import { buildLeaders } from "@/app/features/teams/detail/model/leaders";
import { getCachedSeasonTeamBreakdown } from "@/app/features/teams/detail/getCachedSeasonTeamBreakdown";
import { buildPublicPlayerHref } from "@/app/utils/matchDetailHref";
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

    const [history, statRows, matchHistory, standings, strengths, allRows, breakdowns] = await Promise.all([
        getCachedTeamNameHistory(teamData.team.id),
        getCachedTeamLeaderboard(teamData.team.id, seasonRecord.id),
        getCachedTeamMatches(teamData.team.id, seasonRecord.id),
        getCachedStandings(seasonRecord.id, regionRecord.id),
        getCachedTeamStrengths(seasonRecord.season_number),
        getCachedAllSeasonRows(),
        getCachedSeasonTeamBreakdown(seasonRecord.id),
    ]);

    const seasonTeamIds = standings.map((s) => s.team_id).filter((id): id is string => !!id);
    if (!seasonTeamIds.includes(teamData.team.id)) seasonTeamIds.push(teamData.team.id);
    const strength = seasonStrengths(strengths, seasonRecord.id, seasonTeamIds).get(teamData.team.id) ?? {
        value: null,
        rank: null,
    };

    const rows = allRows as unknown as PlayerLeaderboardRow[];
    const rosterIds = teamData.players.map((p) => p.id);
    const rosterIdSet = new Set(rosterIds);
    const rosterRows = rows.filter((r) => rosterIdSet.has(r.player_id));
    const leaders = buildLeaders({
        rosterIds,
        seasonRows: rosterRows.filter((r) => r.season_id === seasonRecord.id),
        careerRows: rosterRows,
    });
    const leaderPlayers = Object.fromEntries(
        teamData.players.map((p) => [
            p.id,
            {
                name: p.display_name || p.username || "Unknown",
                username: p.username,
                avatarUrl: p.avatar_url,
                href: buildPublicPlayerHref(p.username),
            },
        ]),
    );

    const rosterTiles = buildRosterTiles({
        players: teamData.players,
        rows: rosterRows,
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
            leaders={leaders}
            leaderPlayers={leaderPlayers}
            breakdown={breakdowns[teamData.team.id] ?? null}
        />
    );
}
