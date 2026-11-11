import {DBClient, UserAccountRow} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import type {RoleState} from "@/server/domains/auth/helpers/nextRoleValidity";

export type UserAccountUpsert = {
    user_id: string;
    discord_user_id: string;
    discord_username: string | null;
    discord_display_name: string | null;
    discord_avatar_url: string | null;
    role_ids: string[];
    roles_verified_at: string | null;
    roles_valid_until: string | null;
};

export async function findUserAccount(client: DBClient, userId: string): Promise<Result<UserAccountRow | null>> {
    const {data, error} = await client
        .from("user_accounts")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? null);
}

export async function findAllUserAccounts(client: DBClient): Promise<Result<UserAccountRow[]>> {
    const {data, error} = await client
        .from("user_accounts")
        .select("*")
        .order("discord_display_name", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function upsertUserAccount(admin: DBClient, row: UserAccountUpsert): Promise<Result<true>> {
    const {error} = await admin
        .from("user_accounts")
        .upsert({...row, updated_at: new Date().toISOString()}, {onConflict: "user_id"});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function updateUserAccountRoles(admin: DBClient, userId: string, state: RoleState): Promise<Result<true>> {
    const {error} = await admin
        .from("user_accounts")
        .update({
            role_ids: state.roleIds,
            roles_verified_at: state.rolesVerifiedAt,
            roles_valid_until: state.rolesValidUntil,
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function deleteUserAccount(admin: DBClient, userId: string): Promise<Result<true>> {
    const {error} = await admin.from("user_accounts").delete().eq("user_id", userId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
