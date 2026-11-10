import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import type {TeamStrength} from "@/server/domains/team/types";

export async function findTeamStrengthRatings(supabase: DBClient, seasonNumber: number): Promise<Result<TeamStrength[]>> {
    const {data, error} = await supabase.rpc("team_strength_ratings", {p_season_number: seasonNumber});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map((r) => ({
        teamId: r.team_id,
        seasonId: r.season_id,
        sets: Number(r.sets),
        rating: Number(r.rating),
    })));
}
