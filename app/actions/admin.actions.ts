"use server"

import {Err} from "@/shared/types/result";
import {createError} from "@/server/utils/serializeableError";
import {inviteUser} from "@/server/domains/admin";
import {createServerSupabase} from "@/server/supabase/server";
import {InviteUserSchema} from "@/server/domains/admin";

export async function inviteUserAction(email: string, role: "super_admin" | "admin" | "stat_tracker") {
    const parsed = InviteUserSchema.safeParse({email, role});
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});

    const supabase = await createServerSupabase();
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) {
        return Err(createError("Unauthorized", "UNAUTHORIZED", 401));
    }

    const {data: roleData} = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    if (roleData?.role !== "super_admin") {
        return Err(createError("Forbidden", "FORBIDDEN", 403));
    }

    return inviteUser(parsed.data.email, parsed.data.role, user.id);
}
