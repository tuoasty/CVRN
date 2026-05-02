import {DBClient, Region} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

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
