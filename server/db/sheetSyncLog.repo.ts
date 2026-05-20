import {DBClient, SheetSyncLog} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {SyncChange, SyncError, SyncStatus, SyncTrigger} from "@/server/domains/sheets/types";

type InsertSyncLogDto = {
    sheetConfigId: string;
    triggeredBy: SyncTrigger;
    status: SyncStatus;
    rowsProcessed: number;
    rowsErrored: number;
    errors: SyncError[];
    changes: SyncChange[];
};

export async function insertSyncLog(supabase: DBClient, dto: InsertSyncLogDto): Promise<Result<SheetSyncLog>> {
    const {data, error} = await supabase
        .from("sheet_sync_logs")
        .insert({
            sheet_config_id: dto.sheetConfigId,
            triggered_by: dto.triggeredBy,
            status: dto.status,
            rows_processed: dto.rowsProcessed,
            rows_errored: dto.rowsErrored,
            errors: dto.errors as unknown as import("@/database.types").Json,
            changes: dto.changes as unknown as import("@/database.types").Json,
        })
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findLatestSyncLogByConfigId(supabase: DBClient, configId: string): Promise<Result<SheetSyncLog | null>> {
    const {data, error} = await supabase
        .from("sheet_sync_logs")
        .select("*")
        .eq("sheet_config_id", configId)
        .order("synced_at", {ascending: false})
        .limit(1)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findSyncLogsByConfigId(supabase: DBClient, configId: string, limit = 10): Promise<Result<SheetSyncLog[]>> {
    const {data, error} = await supabase
        .from("sheet_sync_logs")
        .select("*")
        .eq("sheet_config_id", configId)
        .order("synced_at", {ascending: false})
        .limit(limit);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findSyncLogById(supabase: DBClient, id: string): Promise<Result<SheetSyncLog | null>> {
    const {data, error} = await supabase
        .from("sheet_sync_logs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function deleteSyncLogsByConfigId(supabase: DBClient, configId: string): Promise<Result<true>> {
    const {error} = await supabase
        .from("sheet_sync_logs")
        .delete()
        .eq("sheet_config_id", configId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function findAllSyncLogs(supabase: DBClient, limit = 100): Promise<Result<SheetSyncLog[]>> {
    const {data, error} = await supabase
        .from("sheet_sync_logs")
        .select("*")
        .order("synced_at", {ascending: false})
        .limit(limit);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findSyncLogsForRevert(
    supabase: DBClient,
    configId: string,
    fromSyncedAt: string
): Promise<Result<SheetSyncLog[]>> {
    const {data, error} = await supabase
        .from("sheet_sync_logs")
        .select("*")
        .eq("sheet_config_id", configId)
        .neq("triggered_by", "rollback")
        .gte("synced_at", fromSyncedAt)
        .order("synced_at", {ascending: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}
