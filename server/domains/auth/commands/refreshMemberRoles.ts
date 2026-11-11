import "server-only";
import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {createError, SerializableError} from "@/server/utils/serializeableError";
import {findUserAccount, updateUserAccountRoles} from "@/server/db/userAccounts.repo";
import {getGuildMember} from "@/server/discord/client";
import {getSupabaseAdmin} from "@/server/supabase/admin";
import {nextRoleValidity, RoleState} from "../helpers/nextRoleValidity";
import {toMemberLookup} from "../helpers/toMemberLookup";

const inFlight = new Map<string, Promise<Result<RoleState, SerializableError>>>();

async function run(userId: string, now: Date): Promise<Result<RoleState, SerializableError>> {
    const admin = getSupabaseAdmin() as unknown as DBClient;
    const accountResult = await findUserAccount(admin, userId);
    if (!accountResult.ok) return accountResult;
    const account = accountResult.value;
    if (!account) return Err(createError("No Discord account for this user", "NOT_FOUND", 404));

    const lookup = toMemberLookup(await getGuildMember(account.discord_user_id));
    const next = nextRoleValidity(lookup, {
        roleIds: account.role_ids,
        rolesVerifiedAt: account.roles_verified_at,
        rolesValidUntil: account.roles_valid_until,
    }, now);

    const written = await updateUserAccountRoles(admin, userId, next);
    if (!written.ok) return written;
    return Ok(next);
}

export function refreshMemberRoles(userId: string, now: Date = new Date()): Promise<Result<RoleState, SerializableError>> {
    const existing = inFlight.get(userId);
    if (existing) return existing;
    const promise = run(userId, now).finally(() => inFlight.delete(userId));
    inFlight.set(userId, promise);
    return promise;
}
