"use server"

import {processAuthCallback, setUserPassword, signIn, signOut} from "@/server/domains/auth";
import {createServerSupabase} from "@/server/supabase/server";

export async function loginAction(email:string, password:string){
    const supabase = await createServerSupabase()
    return signIn(supabase, email, password)
}

export async function logoutAction(){
    const supabase = await createServerSupabase()
    return signOut(supabase)
}

export async function setPasswordAction(password:string){
    const supabase = await createServerSupabase()
    return setUserPassword(supabase, password)
}

export async function authCallbackAction(url:string){
    const supabase = await createServerSupabase()
    return processAuthCallback(supabase, url)
}