import {
    DBClient,
    PlayerLeaderboardViewRow,
    PlayerMatchStatSet,
    PlayerMatchStatTotal,
    RangedSeasonStatRow,
} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {PlayerMatchStatsInsert} from "@/server/domains/sheets/commands/buildMatchStatsPlan";
import {PlayerRawStatTotalsRow, RawStatSummaryRow} from "@/server/domains/player/types";

export async function findMatchIdsWithStats(supabase: DBClient, matchIds: string[]): Promise<Result<string[]>> {
    if (matchIds.length === 0) return Ok([]);
    const {data, error} = await supabase
        .from("v_matches_with_stats")
        .select("match_id")
        .in("match_id", matchIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).flatMap(r => (r.match_id ? [r.match_id] : [])));
}

export async function findMatchStatSets(
    supabase: DBClient,
    matchId: string
): Promise<Result<PlayerMatchStatSet[]>> {
    const {data, error} = await supabase
        .from("v_player_match_stat_sets")
        .select("*")
        .eq("match_id", matchId)
        .order("set_number", {ascending: true})
        .order("team_id", {ascending: true})
        .order("contributions", {ascending: false, nullsFirst: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findMatchStatTotals(
    supabase: DBClient,
    matchId: string
): Promise<Result<PlayerMatchStatTotal[]>> {
    const {data, error} = await supabase
        .from("v_player_match_stat_totals")
        .select("*")
        .eq("match_id", matchId)
        .order("team_id", {ascending: true})
        .order("contributions", {ascending: false, nullsFirst: false})
        .order("sets_played", {ascending: false, nullsFirst: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findPlayerLeaderboard(
    supabase: DBClient,
    p: {regionCode?: string; seasonId?: string; teamId?: string}
): Promise<Result<PlayerLeaderboardViewRow[]>> {
    let query = supabase.from("v_player_leaderboard").select("*");
    if (p.regionCode) query = query.ilike("region_code", p.regionCode);
    if (p.seasonId) query = query.eq("season_id", p.seasonId);
    if (p.teamId) query = query.eq("team_id", p.teamId);

    const {data, error} = await query.order("points_total", {ascending: false, nullsFirst: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findRangedPlayerLeaderboard(
    supabase: DBClient,
    p: {seasonId: string; from: string; to: string}
): Promise<Result<RangedSeasonStatRow[]>> {
    const {data, error} = await supabase.rpc("get_player_season_stats_ranged", {
        p_season_id: p.seasonId,
        p_from: p.from,
        p_to: p.to,
    });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as RangedSeasonStatRow[]);
}

export async function findPlayerLeaderboardByPosition(
    supabase: DBClient,
    p: {seasonId: string; position: string}
): Promise<Result<RangedSeasonStatRow[]>> {
    const {data, error} = await supabase.rpc("get_player_season_stats_scoped", {
        p_season_id: p.seasonId,
        p_position: p.position,
    });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as RangedSeasonStatRow[]);
}

export async function findPlayerRawStatTotals(
    supabase: DBClient,
    p: {robloxUserId: string; seasonNumber: number | null}
): Promise<Result<PlayerRawStatTotalsRow>> {
    const {data, error} = await supabase
        .rpc("get_player_raw_stat_totals", {
            p_roblox_user_id: String(p.robloxUserId),
            p_season_number: p.seasonNumber ?? undefined,
        })
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data as PlayerRawStatTotalsRow);
}

export async function findRawStatSummary(
    supabase: DBClient,
    seasonNumber: number | null
): Promise<Result<RawStatSummaryRow>> {
    const {data, error} = await supabase
        .rpc("get_raw_stat_summary", {p_season_number: seasonNumber ?? undefined})
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data as RawStatSummaryRow);
}

export async function replaceMatchStats(
    supabase: DBClient,
    matchId: string,
    rows: PlayerMatchStatsInsert[]
): Promise<Result<true>> {
    const {error} = await supabase.rpc("replace_match_player_stats", {
        p_match_id: matchId,
        p_rows: rows,
    });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function clearMatchStats(supabase: DBClient, matchId: string): Promise<Result<true>> {
    const {error} = await supabase.rpc("replace_match_player_stats", {
        p_match_id: matchId,
        p_rows: [],
    });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
