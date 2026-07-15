import {DBClient, Region} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {StandingMethod} from "@/shared/types/standing";

export async function findAllRegions(supabase: DBClient): Promise<Result<Region[]>> {
    const {data, error} = await supabase.from("regions").select("*").order("code", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findRegionByCode(supabase: DBClient, code: string): Promise<Result<Region | null>> {
    const {data, error} = await supabase.from("regions").select("*").ilike("code", code).single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data);
}

// Resolves the standings method of a season's region — drives method-aware points at match completion.
export async function findStandingMethodBySeasonId(supabase: DBClient, seasonId: string): Promise<Result<StandingMethod>> {
    const {data, error} = await supabase
        .from("seasons")
        .select("regions!inner(standing_method)")
        .eq("id", seasonId)
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    const region = data?.regions as unknown as {standing_method: string} | null;
    return Ok((region?.standing_method as StandingMethod) ?? "lvr");
}
