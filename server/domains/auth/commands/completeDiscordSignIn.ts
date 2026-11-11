import "server-only";
import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {createError, SerializableError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {deleteUserAccount, findUserAccount, upsertUserAccount} from "@/server/db/userAccounts.repo";
import {getGuildMember} from "@/server/discord/client";
import {getSupabaseAdmin} from "@/server/supabase/admin";
import {AccessGroup} from "@/shared/types/accessGroup";
import {AuditSnapshot, recordAudit} from "@/server/domains/audit";
import {nextRoleValidity} from "../helpers/nextRoleValidity";
import {toMemberLookup} from "../helpers/toMemberLookup";
import {getCurrentGroups} from "../queries/getCurrentGroups";

export type SignInFailureReason = "no_role" | "discord_unavailable" | "failed";
export type SignInError = SerializableError & {reason: SignInFailureReason};

type DiscordMetadata = {
    provider_id?: string;
    sub?: string;
    name?: string;
    full_name?: string;
    avatar_url?: string;
    custom_claims?: {global_name?: string};
};

function fail(reason: SignInFailureReason, message: string): Result<never, SignInError> {
    return {ok: false, error: {...createError(message, "UNAUTHORIZED", 401), reason}};
}

function refuse(reason: SignInFailureReason, message: string, userId: string | null, snapshot: AuditSnapshot): Result<never, SignInError> {
    recordAudit({kind: "auth", userId, groups: [], action: "signIn", outcome: "denied", target: {reason}, snapshot});
    return fail(reason, message);
}

export async function completeDiscordSignIn(
    supabase: DBClient,
    code: string
): Promise<Result<{groups: AccessGroup[]}, SignInError>> {
    const {data, error} = await supabase.auth.exchangeCodeForSession(code);
    const user = data?.user;
    if (error || !user) {
        logger.warn({error}, "Discord code exchange failed");
        return fail("failed", "Sign-in failed");
    }

    const discordIdentity = user.identities?.find(i => i.provider === "discord");
    const meta = (discordIdentity?.identity_data ?? {}) as DiscordMetadata;
    const discordUserId = meta.provider_id ?? meta.sub ?? discordIdentity?.id;
    if (!discordIdentity || !discordUserId) {
        await supabase.auth.signOut();
        return fail("failed", "Not a Discord account");
    }

    const displayName = meta.custom_claims?.global_name ?? meta.full_name ?? null;
    const snapshot: AuditSnapshot = {
        discordUserId,
        displayName,
        username: meta.name ?? null,
        avatarUrl: meta.avatar_url ?? null,
    };

    const admin = getSupabaseAdmin() as unknown as DBClient;
    const existing = await findUserAccount(admin, user.id);
    if (!existing.ok) {
        await supabase.auth.signOut();
        return refuse("failed", "Account lookup failed", user.id, snapshot);
    }
    const prior = existing.value;

    const lookup = toMemberLookup(await getGuildMember(discordUserId));
    const roles = nextRoleValidity(lookup, prior ? {
        roleIds: prior.role_ids,
        rolesVerifiedAt: prior.roles_verified_at,
        rolesValidUntil: prior.roles_valid_until,
    } : null, new Date());

    const saved = await upsertUserAccount(admin, {
        user_id: user.id,
        discord_user_id: discordUserId,
        discord_username: snapshot.username,
        discord_display_name: displayName,
        discord_avatar_url: snapshot.avatarUrl,
        role_ids: roles.roleIds,
        roles_verified_at: roles.rolesVerifiedAt,
        roles_valid_until: roles.rolesValidUntil,
    });
    if (!saved.ok) {
        await supabase.auth.signOut();
        return refuse("failed", "Account save failed", user.id, snapshot);
    }

    const groups = await getCurrentGroups(supabase);
    if (groups.ok && groups.value.length > 0) {
        recordAudit({kind: "auth", userId: user.id, groups: groups.value, action: "signIn", outcome: "allowed", snapshot});
        return {ok: true, value: {groups: groups.value}};
    }

    await supabase.auth.signOut();
    if (!prior) {
        await deleteUserAccount(admin, user.id);
        const {error: deleteError} = await (admin as unknown as {auth: {admin: {deleteUser: (id: string) => Promise<{error: unknown}>}}}).auth.admin.deleteUser(user.id);
        if (deleteError) logger.error({error: deleteError, userId: user.id}, "Failed to delete refused Discord user");
    }

    const auditUserId = prior ? user.id : null;
    if (!groups.ok) return refuse("failed", "Group lookup failed", auditUserId, snapshot);
    logger.info({discordUserId, lookup: lookup.kind}, "Discord sign-in refused");
    return lookup.kind === "error"
        ? refuse("discord_unavailable", "Discord unavailable", auditUserId, snapshot)
        : refuse("no_role", "No staff role", auditUserId, snapshot);
}
