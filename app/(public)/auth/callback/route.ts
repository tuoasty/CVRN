import {NextRequest, NextResponse} from "next/server";
import {createServerSupabase} from "@/server/supabase/server";
import {completeDiscordSignIn} from "@/server/domains/auth/commands/completeDiscordSignIn";
import {safeReturnPath} from "@/server/domains/auth/helpers/safeReturnPath";
import {canAccessPath, landingFor} from "@/shared/auth/pageAccess";

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const returnPath = safeReturnPath(request.nextUrl.searchParams.get("returnUrl"));

    if (!code) {
        return NextResponse.redirect(new URL("/auth/login?error=failed", request.url));
    }

    const supabase = await createServerSupabase();
    const result = await completeDiscordSignIn(supabase, code);

    if (!result.ok) {
        return NextResponse.redirect(new URL(`/auth/login?error=${result.error.reason}`, request.url));
    }

    const groups = result.value.groups;
    const target = returnPath && canAccessPath(groups, new URL(returnPath, request.url).pathname)
        ? returnPath
        : landingFor(groups);
    return NextResponse.redirect(new URL(target, request.url));
}
