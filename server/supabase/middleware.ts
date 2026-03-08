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

  if (isHome || isCallback) {
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

    if (isInvite && roleData.role !== "super_admin") {
      logger.warn({ user_id: user.id, role: roleData.role }, "Non-super_admin attempted to access invite page");
      return NextResponse.redirect(
          new URL("/admin/dashboard", request.url)
      );
    }

    return supabaseResponse;
  }

  return supabaseResponse;
}