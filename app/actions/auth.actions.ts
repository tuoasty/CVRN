"use server"

import {Err} from "@/shared/types/result";
import {processAuthCallback, setUserPassword, signIn, signOut} from "@/server/domains/auth";
import {createServerSupabase} from "@/server/supabase/server";
import {LoginSchema, SetPasswordSchema, AuthCallbackSchema} from "@/server/domains/auth";

export async function loginAction(email: string, password: string) {
    const parsed = LoginSchema.safeParse({email, password});
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return signIn(supabase, parsed.data.email, parsed.data.password);
}

export async function logoutAction() {
    const supabase = await createServerSupabase();
    return signOut(supabase);
}

export async function setPasswordAction(password: string) {
    const parsed = SetPasswordSchema.safeParse({password});
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return setUserPassword(supabase, parsed.data.password);
}

export async function authCallbackAction(url: string) {
    const parsed = AuthCallbackSchema.safeParse({url});
    if (!parsed.success) return Err({message: "Invalid callback URL", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return processAuthCallback(supabase, parsed.data.url);
}
