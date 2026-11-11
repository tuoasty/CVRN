import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "@/lib/utils";
import {Database} from "@/shared/types/db.override";
import { logger } from "@/server/utils/logger";
import { findUserAccount } from "@/server/db/userAccounts.repo";
import { refreshMemberRoles } from "@/server/domains/auth/commands/refreshMemberRoles";
import { getCurrentGroups } from "@/server/domains/auth/queries/getCurrentGroups";
import { needsRoleRefresh } from "@/server/domains/auth/helpers/needsRoleRefresh";
import { safeReturnPath } from "@/server/domains/auth/helpers/safeReturnPath";
import type { DBClient } from "@/shared/types/db";
import { canAccessPath, landingFor } from "@/shared/auth/pageAccess";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!hasEnvVars) {
    logger.error("Missing environment variables in middleware");
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value),
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
                supabaseResponse.cookies.set(name, value, options),
            );
          },
        },
      },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isHome = pathname === "/";
  const isLogin = pathname === "/auth/login";
  const isCallback = pathname === "/auth/callback"

  const isAdmin = pathname.startsWith("/admin");

  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  const refuse = async () => {
    await supabase.auth.signOut();
    return redirectTo("/auth/login?error=no_role");
  };

  if (isHome || isCallback) {
    return supabaseResponse;
  }

  if (isLogin) {
    if (!user) {
      return supabaseResponse;
    }

    const groups = await getCurrentGroups(supabase as unknown as DBClient);
    if (!groups.ok || groups.value.length === 0) {
      return supabaseResponse;
    }

    const returnPath = safeReturnPath(request.nextUrl.searchParams.get("returnUrl"));
    const target = returnPath && canAccessPath(groups.value, new URL(returnPath, request.url).pathname)
        ? returnPath
        : landingFor(groups.value);
    return redirectTo(target);
  }

  if (isAdmin) {
    if (!user) {
      logger.debug({ pathname }, "Unauthenticated access attempt to admin route");
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("returnUrl", pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    const db = supabase as unknown as DBClient;
    const account = await findUserAccount(db, user.id);
    if (account.ok && account.value && needsRoleRefresh(account.value.roles_valid_until, new Date())) {
      await refreshMemberRoles(user.id);
    }

    const groups = await getCurrentGroups(db);
    if (!groups.ok || groups.value.length === 0) {
      logger.info({ user_id: user.id, pathname }, "User has no groups, signing out");
      return refuse();
    }

    if (!canAccessPath(groups.value, pathname)) {
      logger.debug({ user_id: user.id, groups: groups.value, pathname }, "Groups cannot open this page, redirecting to landing");
      return redirectTo(landingFor(groups.value));
    }

    return supabaseResponse;
  }

  return supabaseResponse;
}