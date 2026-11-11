import {AccessGroup} from "@/shared/types/accessGroup";
import {toAuditTarget} from "@/shared/auth/auditTarget";
import {getSupabaseAdmin} from "@/server/supabase/admin";
import {findUserAccount} from "@/server/db/userAccounts.repo";
import {insertAuditEntry} from "@/server/db/auditLog.repo";
import {runInBackground} from "@/server/utils/runInBackground";
import {logger} from "@/server/utils/logger";

export type AuditSnapshot = {
    discordUserId: string | null;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
};

export type AuditEntryInput = {
    kind?: "action" | "auth";
    userId: string | null;
    groups: AccessGroup[];
    action: string;
    outcome: "allowed" | "denied";
    target?: unknown;
    snapshot?: AuditSnapshot;
};

const EMPTY_SNAPSHOT: AuditSnapshot = {discordUserId: null, displayName: null, username: null, avatarUrl: null};

async function resolveSnapshot(userId: string | null, given?: AuditSnapshot): Promise<AuditSnapshot> {
    if (given) return given;
    if (!userId) return EMPTY_SNAPSHOT;
    const account = await findUserAccount(getSupabaseAdmin(), userId);
    if (!account.ok) {
        logger.error({error: account.error, userId}, "Audit snapshot read failed");
        return EMPTY_SNAPSHOT;
    }
    if (!account.value) return EMPTY_SNAPSHOT;
    return {
        discordUserId: account.value.discord_user_id,
        displayName: account.value.discord_display_name,
        username: account.value.discord_username,
        avatarUrl: account.value.discord_avatar_url,
    };
}

async function writeAudit(entry: AuditEntryInput): Promise<void> {
    try {
        const snapshot = await resolveSnapshot(entry.userId, entry.snapshot);
        const result = await insertAuditEntry(getSupabaseAdmin(), {
            kind: entry.kind ?? "action",
            user_id: entry.userId,
            discord_user_id: snapshot.discordUserId,
            display_name: snapshot.displayName,
            username: snapshot.username,
            avatar_url: snapshot.avatarUrl,
            groups: entry.groups,
            action: entry.action,
            outcome: entry.outcome,
            target: toAuditTarget(entry.target),
        });
        if (!result.ok) logger.error({error: result.error, action: entry.action}, "Audit insert failed");
    } catch (error) {
        logger.error({error, action: entry.action}, "Audit insert failed");
    }
}

export function recordAudit(entry: AuditEntryInput): void {
    try {
        runInBackground(() => writeAudit(entry), "audit");
    } catch (error) {
        logger.error({error, action: entry.action}, "Audit scheduling failed");
    }
}
