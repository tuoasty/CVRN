"use server"

import {Err} from "@/shared/types/result";
import {inviteUser} from "@/server/domains/admin";
import {createServerSupabase} from "@/server/supabase/server";
import {InviteUserSchema} from "@/server/domains/admin";
import {requireSuperAdmin} from "@/server/domains/auth";

export async function inviteUserAction(email: string, role: "super_admin" | "admin" | "stat_tracker" | "staff") {
    const parsed = InviteUserSchema.safeParse({email, role});
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});

    const supabase = await createServerSupabase();
    const guard = await requireSuperAdmin(supabase);
    if (!guard.ok) return guard;

    return inviteUser(parsed.data.email, parsed.data.role, guard.value);
}
