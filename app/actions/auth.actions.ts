"use server"

import {headers} from "next/headers";
import {Err, Ok, Result} from "@/shared/types/result";
import {safeReturnPath} from "@/server/domains/auth/helpers/safeReturnPath";
import {createError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {processAuthCallback, signIn, signOut} from "@/server/domains/auth";
import {createServerSupabase} from "@/server/supabase/server";
import {LoginSchema, AuthCallbackSchema} from "@/server/domains/auth";

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

export async function authCallbackAction(url: string) {
    const parsed = AuthCallbackSchema.safeParse({url});
    if (!parsed.success) return Err({message: "Invalid callback URL", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return processAuthCallback(supabase, parsed.data.url);
}

export async function signInWithDiscordAction(returnUrl?: string | null): Promise<Result<{url: string}>> {
    const requestHeaders = await headers();
    const origin = requestHeaders.get("origin") ?? process.env.SITE_URL;
    if (!origin) return Err(createError("Missing site origin", "UNKNOWN"));

    const returnPath = safeReturnPath(returnUrl ?? null);
    const callback = new URL("/auth/callback", origin);
    if (returnPath) callback.searchParams.set("returnUrl", returnPath);

    const supabase = await createServerSupabase();
    const {data, error} = await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: {redirectTo: callback.toString(), skipBrowserRedirect: true},
    });
    if (error || !data.url) {
        logger.error({error}, "Failed to start Discord sign-in");
        return Err(createError("Could not start Discord sign-in", "INTEGRATION_ERROR"));
    }
    return Ok({url: data.url});
}
