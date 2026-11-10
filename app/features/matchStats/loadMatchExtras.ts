import "server-only";
import type {MatchDetail} from "@/server/domains/match";
import type {PlayerLeaderboardRow} from "@/server/domains/player";
import {
    getCachedAllSeasonRows,
    getCachedLeaderboardIdentity,
    getCachedPlayerLeaderboard,
    getCachedRegions,
    getCachedSeasonCompletedMatches,
    getCachedSeasons,
    getCachedStandings,
    getCachedTeamsWithRegionsIncludingInactive,
} from "@/server/cache/publicReads";
import {getRegionTimezone} from "@/app/utils/timezoneOptions";
import {buildPublicPlayerHref} from "@/app/utils/matchDetailHref";
import {buildTape} from "@/app/(public)/home/model/buildTape";
import type {Tape} from "@/app/(public)/home/model/types";
import {buildPreMatchTeam, type PreMatchTeam} from "./preMatch/buildPreMatchTeam";

export interface MatchExtras {
    tape: Tape | null;
    timeZone: string;
    regionCode: string;
    seasonSlug: string;
    players: {home: PreMatchTeam; away: PreMatchTeam} | null;
}

export async function loadMatchExtras(detail: MatchDetail): Promise<MatchExtras | null> {
    const {match} = detail;
    const [seasons, regions] = await Promise.all([getCachedSeasons(), getCachedRegions()]);
    const season = seasons.find(s => s.id === match.season_id);
    const region = season ? regions.find(r => r.id === season.region_id) : undefined;
    if (!season || !region) return null;

    const homeId = match.home_team_id;
    const awayId = match.away_team_id;
    const isCompleted = match.status === "completed";
    const needsPlayers = !match.is_forfeit && !!detail.rosters;

    const [standings, completed, leaderRows, identity, teams, allRows] = await Promise.all([
        getCachedStandings(season.id, region.id),
        getCachedSeasonCompletedMatches(season.id),
        getCachedPlayerLeaderboard(season.id),
        getCachedLeaderboardIdentity(),
        getCachedTeamsWithRegionsIncludingInactive(),
        needsPlayers ? getCachedAllSeasonRows() : Promise.resolve([]),
    ]);

    const teamName = (id: string) => teams.find(t => t.id === id)?.name ?? null;
    const resolvePlayer = (playerId: string) => {
        const p = identity.players[playerId];
        if (!p) return null;
        return {name: p.display_name || p.username, username: p.username, avatarUrl: p.avatar_url, href: buildPublicPlayerHref(p.username)};
    };

    const tape = homeId && awayId
        ? buildTape({
            homeTeamId: homeId,
            awayTeamId: awayId,
            standings,
            standingMethod: region.standing_method,
            completed: completed.filter(m => m.match.id !== match.id),
            leaderRows,
            matchTotals: isCompleted ? detail.statTotals : null,
            before: match.scheduled_at,
            resolvePlayer,
            teamName,
        })
        : null;

    const rows = allRows as unknown as PlayerLeaderboardRow[];
    const players = needsPlayers && detail.rosters
        ? {
            home: buildPreMatchTeam({roster: detail.rosters.home, rows, seasonId: season.id, regionId: region.id}),
            away: buildPreMatchTeam({roster: detail.rosters.away, rows, seasonId: season.id, regionId: region.id}),
        }
        : null;

    return {
        tape,
        timeZone: getRegionTimezone(region.code),
        regionCode: region.code,
        seasonSlug: season.slug,
        players,
    };
}
