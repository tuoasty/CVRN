"use server"

import {createClient} from "@/server/supabase/server";
import {Err} from "@/shared/types/result";
import {createError} from "@/server/utils/serializeableError";
import {inviteUser} from "@/server/services/admin.service";

export async function inviteUserAction(email:string, role:"super_admin"|"admin"|"stat_tracker"){
    const supabase = await createClient()
    const {
        data: {user},
    } = await supabase.auth.getUser();
    if(!user){
        // const url = new URL("/", request.url);
        // url.searchParams.set("redirect", pathname);
        // return NextResponse.redirect(url);
        return Err(createError("Unauthorized", "UNAUTHORIZED", 401));
    }

    const { data: roleData} = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    if(roleData?.role !== "super_admin"){
        // const url = new URL("/", request.url);
        // url.searchParams.set("redirect", pathname);
        // return NextResponse.redirect(url);
        return Err(createError("Forbidden", "FORBIDDEN", 403));
    }

    return inviteUser(email, role, user.id)
}
