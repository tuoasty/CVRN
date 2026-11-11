import {AuditLogInsert, AuditLogRow, DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

export type AuditEntryQuery = {
    before?: number;
    userId?: string;
    action?: string;
    kind?: "action" | "auth";
    outcome?: "allowed" | "denied";
    limit: number;
};

export async function insertAuditEntry(admin: DBClient, row: AuditLogInsert): Promise<Result<true>> {
    const {error} = await admin.from("audit_log").insert(row);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function findAuditEntries(client: DBClient, q: AuditEntryQuery): Promise<Result<AuditLogRow[]>> {
    let query = client
        .from("audit_log")
        .select("*")
        .order("id", {ascending: false})
        .limit(q.limit);
    if (q.before !== undefined) query = query.lt("id", q.before);
    if (q.userId) query = query.eq("user_id", q.userId);
    if (q.action) query = query.ilike("action", `%${q.action}%`);
    if (q.kind) query = query.eq("kind", q.kind);
    if (q.outcome) query = query.eq("outcome", q.outcome);

    const {data, error} = await query;
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}
