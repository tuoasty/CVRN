import {DBClient, Standing} from "@/shared/types/db";
import {GetStandingsInput} from "@/server/domains/standing";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

export async function findStandingsBySeasonAndRegion(
    supabase: DBClient,
    p: GetStandingsInput
): Promise<Result<Standing[]>> {
    let query = supabase
        .from("standings")
        .select("*");

    if (p.seasonId) {
        query = query.eq("season_id", p.seasonId);
    }

    if (p.regionId) {
        query = query.eq("region_id", p.regionId);
    }

    query = query.order("rank", {ascending: true});

    const {data, error} = await query;
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as Standing[]);
}
