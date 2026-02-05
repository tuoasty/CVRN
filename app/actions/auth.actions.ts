"use server"

import {inviteUser, signIn} from "@/server/services/auth.service";
import {createClient} from "@/server/supabase/server";
import {NextResponse} from "next/server";

export async function loginAction(email:string, password:string){
    return signIn(email, password)
}

export async function inviteUserAction(email:string, role:"super_admin"|"admin"|"stat_tracker"){
    const supabase = await createClient()
    const {
        data: {user},
    } = await supabase.auth.getUser();
    if(!user){
        // const url = new URL("/", request.url);
        // url.searchParams.set("redirect", pathname);
        // return NextResponse.redirect(url);
        throw new Error("Unauthorized")
    }

    const { data: roleData} = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
    if(roleData?.role !== "super_admin"){
        // const url = new URL("/", request.url);
        // url.searchParams.set("redirect", pathname);
        // return NextResponse.redirect(url);
        throw new Error("Forbidden")
    }

    return inviteUser(email, role, user.id)
}

