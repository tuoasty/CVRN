import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {SpecWinnerWithRefs} from "@/server/domains/spec/types";

const SELECT_WITH_REFS =
    "id, season_id, spec_id, player_id, stars_awarded, created_at, updated_at, " +
    "spec:specs(id, name, stars, position), " +
    "player:players(id, username, display_name, avatar_url)";

export async function findSpecWinnersBySeason(
    supabase: DBClient,
    seasonId: string
): Promise<Result<SpecWinnerWithRefs[]>> {
    const {data, error} = await supabase
        .from("spec_winners")
        .select(SELECT_WITH_REFS)
        .eq("season_id", seasonId)
        .order("stars_awarded", {ascending: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as SpecWinnerWithRefs[]);
}

export interface RosterSpecRow {
    player_id: string;
    stars_awarded: number;
    spec: {name: string; position: string; stars: number} | null;
}

export async function findSpecWinnersBySeasonAndPlayers(
    supabase: DBClient,
    seasonId: string,
    playerIds: string[]
): Promise<Result<RosterSpecRow[]>> {
    if (playerIds.length === 0) return Ok([]);
    const {data, error} = await supabase
        .from("spec_winners")
        .select("player_id, stars_awarded, spec:specs(name, position, stars)")
        .eq("season_id", seasonId)
        .in("player_id", playerIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as RosterSpecRow[]);
}

export async function upsertSpecWinner(
    supabase: DBClient,
    p: {seasonId: string; specId: string; playerId: string; starsAwarded: number}
): Promise<Result<SpecWinnerWithRefs>> {
    const {data, error} = await supabase
        .from("spec_winners")
        .upsert(
            {
                season_id: p.seasonId,
                spec_id: p.specId,
                player_id: p.playerId,
                stars_awarded: p.starsAwarded,
                updated_at: new Date().toISOString(),
            },
            {onConflict: "season_id,spec_id"}
        )
        .select(SELECT_WITH_REFS)
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data as unknown as SpecWinnerWithRefs);
}

export async function deleteSpecWinnerById(
    supabase: DBClient,
    id: string
): Promise<Result<true>> {
    const {error} = await supabase.from("spec_winners").delete().eq("id", id);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
