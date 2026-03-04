import { updateSession } from "@/server/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = await updateSession(request);

  if (response) {
    const responseHeaders = new Headers(response.headers);
    requestHeaders.forEach((value, key) => {
      responseHeaders.set(key, value);
    });
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};