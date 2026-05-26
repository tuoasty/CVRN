import {DBClient, PlayerMatchStatSet, PlayerMatchStatTotal} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {PlayerMatchStatsInsert} from "@/server/domains/sheets/commands/buildMatchStatsPlan";

// Of the given match ids, returns those that already have at least one stat row.
export async function findMatchIdsWithStats(supabase: DBClient, matchIds: string[]): Promise<Result<string[]>> {
    if (matchIds.length === 0) return Ok([]);
    const {data, error} = await supabase
        .from("player_match_stats")
        .select("match_id")
        .in("match_id", matchIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    const unique = Array.from(new Set((data ?? []).map(r => r.match_id)));
    return Ok(unique);
}

// Per-set rows for a single match, ordered by (set, team, contributions desc).
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

// Per-match per-player totals (summed across sets).
export async function findMatchStatTotals(
    supabase: DBClient,
    matchId: string
): Promise<Result<PlayerMatchStatTotal[]>> {
    const {data, error} = await supabase
        .from("v_player_match_stat_totals")
        .select("*")
        .eq("match_id", matchId)
        .order("team_id", {ascending: true})
        .order("contributions", {ascending: false, nullsFirst: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

// Atomic delete-then-insert via the replace_match_player_stats RPC.
// One transaction inside the function body — caller sees old rows on failure,
// only the new rows on success.
//
// NOTE: after `supabase gen types typescript --linked > database.types.ts` is
// re-run (post-migration), the rpc() call becomes fully typed. Until then the
// argument shape is checked against the SQL function signature only.
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
