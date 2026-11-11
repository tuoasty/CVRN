import {NextRequest, NextResponse} from "next/server";
import {createServerSupabase} from "@/server/supabase/server";
import {completeDiscordSignIn} from "@/server/domains/auth/commands/completeDiscordSignIn";
import {safeReturnPath} from "@/server/domains/auth/helpers/safeReturnPath";
import {canAccessPath, landingFor} from "@/shared/auth/pageAccess";
import {publicOrigin} from "@/server/domains/auth/helpers/publicOrigin";

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const returnPath = safeReturnPath(request.nextUrl.searchParams.get("returnUrl"));
    const origin = publicOrigin(request.headers, request.nextUrl.origin);

    if (!code) {
        return NextResponse.redirect(new URL("/auth/login?error=failed", origin));
    }

    const supabase = await createServerSupabase();
    const result = await completeDiscordSignIn(supabase, code);

    if (!result.ok) {
        return NextResponse.redirect(new URL(`/auth/login?error=${result.error.reason}`, origin));
    }

    const groups = result.value.groups;
    const target = returnPath && canAccessPath(groups, new URL(returnPath, origin).pathname)
        ? returnPath
        : landingFor(groups);
    return NextResponse.redirect(new URL(target, origin));
}
