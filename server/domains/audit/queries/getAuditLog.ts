import "server-only";
import {AuditLogRow, DBClient, UserAccountRow} from "@/shared/types/db";
import {Ok, Result} from "@/shared/types/result";
import {getSupabaseAdmin} from "@/server/supabase/admin";
import {findAuditEntries} from "@/server/db/auditLog.repo";
import {findAllUserAccounts} from "@/server/db/userAccounts.repo";
import type {AuditValue} from "@/shared/auth/auditTarget";
import type {AuditEntry, AuditPage, AuditPerson, GetAuditLogInput} from "../types";

const PAGE_SIZE = 50;

function toEntry(row: AuditLogRow): AuditEntry {
    return {
        id: row.id,
        createdAt: row.created_at,
        kind: row.kind === "auth" ? "auth" : "action",
        userId: row.user_id,
        displayName: row.display_name,
        username: row.username,
        avatarUrl: row.avatar_url,
        groups: row.groups,
        action: row.action,
        outcome: row.outcome === "denied" ? "denied" : "allowed",
        target: (row.target ?? null) as Record<string, AuditValue> | null,
    };
}

function personName(person: AuditPerson): string {
    return (person.displayName ?? person.username ?? "").toLowerCase();
}

function toPeople(accounts: UserAccountRow[]): AuditPerson[] {
    return accounts
        .map(a => ({userId: a.user_id, displayName: a.discord_display_name, username: a.discord_username}))
        .sort((a, b) => personName(a).localeCompare(personName(b)));
}

export async function getAuditLog(supabase: DBClient, input: GetAuditLogInput): Promise<Result<AuditPage>> {
    const action = input.action?.replace(/\s+/g, "");
    const [entries, accounts] = await Promise.all([
        findAuditEntries(supabase, {
            before: input.before,
            userId: input.userId,
            action: action || undefined,
            kind: input.kind,
            outcome: input.outcome,
            limit: PAGE_SIZE + 1,
        }),
        findAllUserAccounts(getSupabaseAdmin() as unknown as DBClient),
    ]);
    if (!entries.ok) return entries;
    if (!accounts.ok) return accounts;

    const page = entries.value.slice(0, PAGE_SIZE).map(toEntry);
    const nextCursor = entries.value.length > PAGE_SIZE ? page[page.length - 1].id : null;

    return Ok({entries: page, nextCursor, people: toPeople(accounts.value)});
}
