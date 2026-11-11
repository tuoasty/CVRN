import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "@/lib/utils";
import {Database} from "@/shared/types/db.override";
import { logger } from "@/server/utils/logger";
import { getUserRole } from "@/server/db/roles.repo";
import { findUserAccount } from "@/server/db/userAccounts.repo";
import { refreshMemberRoles } from "@/server/domains/auth/commands/refreshMemberRoles";
import { getCurrentGroups } from "@/server/domains/auth/queries/getCurrentGroups";
import { needsRoleRefresh } from "@/server/domains/auth/helpers/needsRoleRefresh";
import { safeReturnPath } from "@/server/domains/auth/helpers/safeReturnPath";
import type { DBClient } from "@/shared/types/db";

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
  const isSuperAdminPage = pathname === "/admin/invite" || pathname === "/admin/staff";

  const refuse = async () => {
    await supabase.auth.signOut();
    const refused = NextResponse.redirect(new URL("/auth/login?error=no_role", request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) => refused.cookies.set(cookie));
    return refused;
  };

  if (isHome || isCallback) {
    return supabaseResponse;
  }

  if (isLogin) {
    if (user) {
      const url = new URL("/admin/dashboard", request.url);
      const returnPath = safeReturnPath(request.nextUrl.searchParams.get("returnUrl"));

      if (returnPath) {
        const role = await getUserRole(supabase as unknown as DBClient, user.id);
        if (!role.ok || !role.value) {
          return NextResponse.redirect(url);
        }

        return NextResponse.redirect(new URL(returnPath, request.url));
      }

      return NextResponse.redirect(url);
    }

    return supabaseResponse;
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
    if (account.ok && account.value) {
      if (needsRoleRefresh(account.value.roles_valid_until, new Date())) {
        await refreshMemberRoles(user.id);
      }

      const groups = await getCurrentGroups(db);
      if (!groups.ok || groups.value.length === 0) {
        logger.info({ user_id: user.id, pathname }, "Discord user has no groups, signing out");
        return refuse();
      }
    }

    const roleResult = await getUserRole(db, user.id);
    const roleData = roleResult.ok && roleResult.value ? { role: roleResult.value } : null;

    if (!roleData?.role) {
      logger.warn({ user_id: user.id, pathname }, "User missing role, signing out");
      return refuse();
    }

    if (roleData.role === "none") {
      logger.debug({ user_id: user.id, pathname }, "user with role none redirected home");
      return NextResponse.redirect(
          new URL("/", request.url)
      );
    }

    if (isSuperAdminPage && roleData.role !== "super_admin") {
      logger.warn({ user_id: user.id, role: roleData.role, pathname }, "Non-super_admin attempted to access a super_admin page");
      return NextResponse.redirect(
          new URL("/admin/dashboard", request.url)
      );
    }

    if (roleData.role === "stat_tracker" && pathname !== "/admin/sync/history") {
      logger.debug({ user_id: user.id, pathname }, "stat_tracker redirected to sync history");
      return NextResponse.redirect(
          new URL("/admin/sync/history", request.url)
      );
    }

    const staffAllowed = pathname === "/admin/teams" || pathname === "/admin/sync/history";
    if (roleData.role === "staff" && !staffAllowed) {
      logger.debug({ user_id: user.id, pathname }, "staff redirected to teams");
      return NextResponse.redirect(
          new URL("/admin/teams", request.url)
      );
    }

    const specManagerAllowed = pathname === "/admin/specs" || pathname === "/admin/specs/qualify" || pathname === "/admin/game-data/specs";
    if (roleData.role === "spec_manager" && !specManagerAllowed) {
      logger.debug({ user_id: user.id, pathname }, "spec_manager redirected to specs");
      return NextResponse.redirect(
          new URL("/admin/specs", request.url)
      );
    }

    const informationManagerAllowed = pathname.startsWith("/admin/game-data/") && !pathname.startsWith("/admin/game-data/import");
    if (roleData.role === "information_manager" && !informationManagerAllowed) {
      logger.debug({ user_id: user.id, pathname }, "information_manager redirected to information");
      return NextResponse.redirect(
          new URL("/admin/game-data/rollables", request.url)
      );
    }

    return supabaseResponse;
  }

  return supabaseResponse;
}