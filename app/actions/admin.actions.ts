"use server"

import {Err} from "@/shared/types/result";
import {createError} from "@/server/utils/serializeableError";
import {inviteUser} from "@/server/services/admin.service";
import {createServerSupabase} from "@/server/supabase/server";

export async function inviteUserAction(email:string, role:"super_admin"|"admin"|"stat_tracker"){
    const supabase = await createServerSupabase()
    const {
        data: {user},
    } = await supabase.auth.getUser();
    if(!user){
        return Err(createError("Unauthorized", "UNAUTHORIZED", 401));
    }

    const { data: roleData} = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    if(roleData?.role !== "super_admin"){
        return Err(createError("Forbidden", "FORBIDDEN", 403));
    }

    return inviteUser(email, role, user.id)
}
