import {DBClient} from "@/shared/types/db";
import {Ok, Result} from "@/shared/types/result";
import {findAllRegions} from "@/server/db/regions.repo";
import {findAllSeasons} from "@/server/db/seasons.repo";
import {findDashboardMatchRows} from "@/server/db/matches.repo";
import {DashboardTeamRow, findDashboardTeamsBySeasonIds} from "@/server/db/teams.repo";
import {findMatchMediaByMatchIds, findRoundMediaBySeasonIds} from "@/server/db/mediaPost.repo";
import type {MediaPost} from "@/server/domains/media/types";
import {buildDashboardRounds, isDashboardMatch} from "../helpers/buildDashboardRounds";
import {pickDashboardSeasons} from "../helpers/pickDashboardSeasons";
import type {DashboardColumn, DashboardMatchRow, DashboardTeam} from "../types/dashboard";

const DAY_MS = 24 * 60 * 60 * 1000;

function toDashboardTeam(team: DashboardTeamRow): DashboardTeam {
    return {id: team.id, name: team.name, logoUrl: team.logo_url};
}

export async function getAdminDashboard(supabase: DBClient, now: Date = new Date()): Promise<Result<DashboardColumn[]>> {
    const [regions, seasons] = await Promise.all([findAllRegions(supabase), findAllSeasons(supabase)]);
    if (!regions.ok) return regions;
    if (!seasons.ok) return seasons;

    const picked = pickDashboardSeasons(regions.value, seasons.value);
    if (picked.length === 0) return Ok([]);
    const seasonIds = picked.map(({season}) => season.id);

    const [teams, rows] = await Promise.all([
        findDashboardTeamsBySeasonIds(supabase, seasonIds),
        findDashboardMatchRows(
            supabase,
            seasonIds,
            new Date(now.getTime() - 14 * DAY_MS).toISOString(),
            new Date(now.getTime() + 7 * DAY_MS).toISOString(),
        ),
    ]);
    if (!teams.ok) return teams;
    if (!rows.ok) return rows;

    const teamById = new Map(teams.value.map(team => [team.id, team]));
    const isByeTeam = (teamId: string) => teamById.get(teamId)?.is_bye ?? true;
    const selected = rows.value.filter(row => isDashboardMatch(row, isByeTeam, now));

    const [media, roundMedia] = await Promise.all([
        findMatchMediaByMatchIds(supabase, selected.map(row => row.id)),
        findRoundMediaBySeasonIds(supabase, seasonIds),
    ]);
    if (!media.ok) return media;
    if (!roundMedia.ok) return roundMedia;

    const roundPost = (seasonId: string, type: "potw" | "totw", roundKey: string) =>
        roundMedia.value.find(post => post.season_id === seasonId && post.type === type && post.round_key === roundKey) ?? null;

    const mediaByMatch = new Map<string, {gfx: MediaPost | null; vod: MediaPost | null}>();
    for (const post of media.value) {
        if (!post.match_id) continue;
        const entry = mediaByMatch.get(post.match_id) ?? {gfx: null, vod: null};
        if (post.type === "gfx") entry.gfx ??= post;
        else entry.vod ??= post;
        mediaByMatch.set(post.match_id, entry);
    }

    const toMatch = (row: DashboardMatchRow) => ({
        id: row.id,
        matchCode: row.match_code,
        matchType: row.match_type,
        week: row.week,
        playoffRound: row.playoff_round,
        home: toDashboardTeam(teamById.get(row.home_team_id!)!),
        away: toDashboardTeam(teamById.get(row.away_team_id!)!),
        gfx: mediaByMatch.get(row.id)?.gfx ?? null,
        vod: mediaByMatch.get(row.id)?.vod ?? null,
    });

    return Ok(picked.map(({region, season}) => ({
        regionCode: region.code.toUpperCase(),
        seasonId: season.id,
        seasonName: season.name,
        teamCount: teams.value.filter(team => team.season_id === season.id && !team.is_bye && !team.deleted_at).length,
        rounds: buildDashboardRounds(selected.filter(row => row.season_id === season.id), now).map(group => ({
            key: group.key,
            matchType: group.matchType,
            week: group.week,
            playoffRound: group.playoffRound,
            matches: group.rows.map(toMatch),
            potw: roundPost(season.id, "potw", group.key),
            totw: roundPost(season.id, "totw", group.key),
        })),
    })));
}
