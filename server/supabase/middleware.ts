import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "@/lib/utils";
import {Database} from "@/shared/types/db.override";
import { logger } from "@/server/utils/logger";

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
  const isSetPassword = pathname === "/auth/set-password";

  const isAdmin = pathname.startsWith("/admin");
  const isInvite = pathname === "/admin/invite";
  const isInformation = pathname === "/information" || pathname.startsWith("/information/");

  if (isHome || isCallback) {
    return supabaseResponse;
  }

  if (isInformation) {
    if (!user) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

    if (roleData?.role !== "admin" && roleData?.role !== "super_admin") {
      logger.debug({ user_id: user.id, pathname }, "non-admin redirected from information");
      return NextResponse.redirect(new URL("/", request.url));
    }

    return supabaseResponse;
  }

  if (isLogin) {
    if (user) {
      const url = new URL("/admin/dashboard", request.url);
      const returnUrl = request.nextUrl.searchParams.get("returnUrl");

      if (returnUrl) {
        const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .single();

        if (!roleData?.role) {
          return NextResponse.redirect(url);
        }

        return NextResponse.redirect(new URL(returnUrl, request.url));
      }

      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  if (isSetPassword) {
    if (!user) {
      return NextResponse.redirect(
          new URL("/", request.url)
      );
    }

    return supabaseResponse;
  }

  if (isAdmin) {
    if (!user) {
      logger.debug({ pathname }, "Unauthenticated access attempt to admin route");
      return NextResponse.redirect(
          new URL("/", request.url)
      );
    }

    const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

    if (!roleData?.role) {
      logger.warn({ user_id: user.id, pathname }, "User missing role");
      return NextResponse.redirect(
          new URL("/auth/set-password", request.url)
      );
    }

    if (roleData.role === "none") {
      logger.debug({ user_id: user.id, pathname }, "user with role none redirected home");
      return NextResponse.redirect(
          new URL("/", request.url)
      );
    }

    if (isInvite && roleData.role !== "super_admin") {
      logger.warn({ user_id: user.id, role: roleData.role }, "Non-super_admin attempted to access invite page");
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