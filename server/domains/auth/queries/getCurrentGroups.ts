import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {AccessGroup, isAccessGroup} from "@/shared/types/accessGroup";

export async function getCurrentGroups(supabase: DBClient): Promise<Result<AccessGroup[]>> {
    const {data, error} = await supabase.rpc("current_groups");
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(((data ?? []) as unknown[]).filter(isAccessGroup));
}
