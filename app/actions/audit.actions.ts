"use server"

import {Err, Result} from "@/shared/types/result";
import {createServerSupabase} from "@/server/supabase/server";
import {requireGroups} from "@/server/domains/auth";
import {AuditPage, getAuditLog, GetAuditLogSchema} from "@/server/domains/audit";

export async function getAuditLogAction(input: unknown): Promise<Result<AuditPage>> {
    const parsed = GetAuditLogSchema.safeParse(input ?? {});
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireGroups(supabase, ["admin"]);
    if (!guard.ok) return guard;
    return getAuditLog(supabase, parsed.data);
}
