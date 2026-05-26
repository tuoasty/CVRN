import {DBClient, MatchSheetConfig} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

export async function findAllMatchSheetConfigs(supabase: DBClient): Promise<Result<MatchSheetConfig[]>> {
    const {data, error} = await supabase
        .from("match_sheet_config")
        .select("*")
        .order("created_at", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findMatchSheetConfigById(supabase: DBClient, id: string): Promise<Result<MatchSheetConfig | null>> {
    const {data, error} = await supabase
        .from("match_sheet_config")
        .select("*")
        .eq("id", id)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findMatchSheetConfigByMatchId(supabase: DBClient, matchId: string): Promise<Result<MatchSheetConfig | null>> {
    const {data, error} = await supabase
        .from("match_sheet_config")
        .select("*")
        .eq("match_id", matchId)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function insertMatchSheetConfig(supabase: DBClient, dto: {matchId: string; sheetId: string}): Promise<Result<MatchSheetConfig>> {
    const {data, error} = await supabase
        .from("match_sheet_config")
        .insert({match_id: dto.matchId, sheet_id: dto.sheetId})
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function updateMatchSheetConfig(supabase: DBClient, id: string, dto: {sheetId: string}): Promise<Result<MatchSheetConfig>> {
    const {data, error} = await supabase
        .from("match_sheet_config")
        .update({sheet_id: dto.sheetId, updated_at: new Date().toISOString()})
        .eq("id", id)
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function deleteMatchSheetConfig(supabase: DBClient, id: string): Promise<Result<true>> {
    const {error} = await supabase.from("match_sheet_config").delete().eq("id", id);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
