import {DBClient, DiscordRoleGroupRow, UserGroupBlockRow} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import type {AccessGroup} from "@/shared/types/accessGroup";

export async function findAllRoleGroups(client: DBClient): Promise<Result<DiscordRoleGroupRow[]>> {
    const {data, error} = await client.from("discord_role_groups").select("*");
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function deleteRoleGroupsExcept(client: DBClient, roleId: string, keep: AccessGroup[]): Promise<Result<true>> {
    let query = client.from("discord_role_groups").delete().eq("role_id", roleId);
    if (keep.length > 0) query = query.not("group_name", "in", `(${keep.join(",")})`);
    const {error} = await query;
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function upsertRoleGroups(client: DBClient, roleId: string, groups: AccessGroup[], actorId: string): Promise<Result<true>> {
    if (groups.length === 0) return Ok(true);
    const now = new Date().toISOString();
    const {error} = await client
        .from("discord_role_groups")
        .upsert(groups.map(group_name => ({role_id: roleId, group_name, updated_by: actorId, updated_at: now})), {onConflict: "role_id,group_name"});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function findAllUserBlocks(client: DBClient): Promise<Result<UserGroupBlockRow[]>> {
    const {data, error} = await client.from("user_group_blocks").select("*");
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findUserBlocks(client: DBClient, userId: string): Promise<Result<UserGroupBlockRow[]>> {
    const {data, error} = await client.from("user_group_blocks").select("*").eq("user_id", userId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function insertUserBlocks(client: DBClient, userId: string, groups: (AccessGroup | null)[], actorId: string): Promise<Result<true>> {
    if (groups.length === 0) return Ok(true);
    const {error} = await client
        .from("user_group_blocks")
        .insert(groups.map(group_name => ({user_id: userId, group_name, blocked_by: actorId})));
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function deleteUserBlocks(client: DBClient, userId: string, groups: (AccessGroup | null)[]): Promise<Result<true>> {
    const named = groups.filter((g): g is AccessGroup => g !== null);
    if (named.length > 0) {
        const {error} = await client.from("user_group_blocks").delete().eq("user_id", userId).in("group_name", named);
        if (error) return Err(serializeError(error, "DB_ERROR"));
    }
    if (groups.includes(null)) {
        const {error} = await client.from("user_group_blocks").delete().eq("user_id", userId).is("group_name", null);
        if (error) return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(true);
}
