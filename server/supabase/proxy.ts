import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "@/lib/utils";

const ROLE_ROUTES = {
  super_admin: ['/admin', '/admin/dashboard'],
  // admin: ['/admin', '/admin/content'],
  // stat_tracker: ['/admin', '/admin/stats'],
};

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!hasEnvVars) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
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

  const { data: {user} } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  const isAuthRoute = pathname.startsWith("/auth");
  const isAdminRoute = pathname.startsWith("/admin");
  const isRegisterRoute = pathname.startsWith("/auth/register");

  if(isRegisterRoute){
    return supabaseResponse;
  }

  if(isAuthRoute && user && !isRegisterRoute){
    const {data: roleData} = await supabase.from("user_roles").select("role").eq("user_id", user.id).single()

    if(roleData?.role){
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/pending", request.url));
    }
  }

  if(isAdminRoute){
    if(!user){
      const url = new URL("/", request.url);
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const {data: roleData} = await supabase
        .from("user_roles").select("role").eq("user_id", user.id).single();
    if(!roleData?.role){
      return NextResponse.redirect(new URL("/pending", request.url));
    }

    const userRole = roleData.role as keyof typeof ROLE_ROUTES;
    const allowedRoutes = ROLE_ROUTES[userRole] || [];
    const hasAccess = allowedRoutes.some(route => pathname.startsWith(route));
    if(!hasAccess){
      //change with default admin route
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    //super admin check
    if(pathname.startsWith("/admin/users") || pathname.startsWith("/admin/roles")){
      if(roleData.role !== 'super_admin'){
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
    }
  }

  return supabaseResponse;
}
