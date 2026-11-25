import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

export type RobloxUserCacheRow = {
    roblox_user_id: string;
    username: string | null;
    display_name: string | null;
    fetched_at: string;
};

export async function findRobloxUserCacheRows(supabase: DBClient, robloxUserIds: string[]): Promise<Result<RobloxUserCacheRow[]>> {
    if (robloxUserIds.length === 0) return Ok([]);
    const {data, error} = await supabase
        .from("roblox_user_cache")
        .select("roblox_user_id, username, display_name, fetched_at")
        .in("roblox_user_id", robloxUserIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function upsertRobloxUserCacheRows(supabase: DBClient, rows: RobloxUserCacheRow[]): Promise<Result<true>> {
    if (rows.length === 0) return Ok(true);
    const {error} = await supabase.from("roblox_user_cache").upsert(rows, {onConflict: "roblox_user_id"});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
