"use server"

import {Err, Result} from "@/shared/types/result";
import {DashboardColumn, getAdminDashboard, inviteUser} from "@/server/domains/admin";
import {createServerSupabase} from "@/server/supabase/server";
import {InviteUserSchema, InvitableRole} from "@/server/domains/admin";
import {requireAdmin, requireSuperAdmin} from "@/server/domains/auth";

export async function getAdminDashboardAction(): Promise<Result<DashboardColumn[]>> {
    const supabase = await createServerSupabase();
    const guard = await requireAdmin(supabase);
    if (!guard.ok) return guard;

    return getAdminDashboard(supabase);
}

export async function inviteUserAction(email: string, role: InvitableRole) {
    const parsed = InviteUserSchema.safeParse({email, role});
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});

    const supabase = await createServerSupabase();
    const guard = await requireSuperAdmin(supabase);
    if (!guard.ok) return guard;

    return inviteUser(parsed.data.email, parsed.data.role, guard.value);
}
