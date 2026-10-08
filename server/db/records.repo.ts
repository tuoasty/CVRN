import {DBClient, RecordViewRow} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

export async function findRecordsByScope(supabase: DBClient, scopeKey: string): Promise<Result<RecordViewRow[]>> {
    const {data, error} = await supabase
        .from("v_records")
        .select("*")
        .eq("scope_key", scopeKey)
        .order("row_num", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function refreshRecordsView(supabase: DBClient): Promise<Result<true>> {
    const {error} = await supabase.rpc("refresh_records");
    if (error) return Err(serializeError(error, error.code === "42501" ? "FORBIDDEN" : "DB_ERROR"));
    return Ok(true);
}
