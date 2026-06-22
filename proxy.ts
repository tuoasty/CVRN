import { NextResponse } from "next/server";
import { updateSession } from "@/server/supabase/middleware";
import type { NextRequest } from "next/server";

const FLAT_LIST_ROUTES = new Set(["/home", "/matches", "/standings", "/teams", "/playoffs", "/media"]);

// First segments that are real static routes, not a region code — keep the generic
// /[region]/[season]/home redirect from matching them (e.g. /matches/as/home).
const RESERVED_FIRST_SEGMENTS = new Set(["matches", "teams", "archive", "players", "auth", "admin", "select"]);

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Old flat list routes → landing page
    if (FLAT_LIST_ROUTES.has(pathname)) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    // /matches/[region]/[season]/[code]/[teams] → /[region]/[season]/matches/[code]/[teams]
    const matchDetail = pathname.match(/^\/matches\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (matchDetail) {
        const [, region, season, code, teams] = matchDetail;
        return NextResponse.redirect(new URL(`/${region}/${season}/matches/${code}/${teams}`, request.url));
    }

    // /teams/[region]/[season]/[teamName] → /[region]/[season]/teams/[teamName]
    const teamDetail = pathname.match(/^\/teams\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (teamDetail) {
        const [, region, season, teamName] = teamDetail;
        return NextResponse.redirect(new URL(`/${region}/${season}/teams/${teamName}`, request.url));
    }

    // /archive/[region]/[slug] → / (can't reconstruct season context without a DB lookup)
    const archiveDetail = pathname.match(/^\/archive\/([^/]+)\/([^/]+)$/);
    if (archiveDetail) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    // Old season home /[region]/[season]/home → /[region]/[season] (home is now the bare path)
    const seasonHome = pathname.match(/^\/([^/]+)\/([^/]+)\/home$/);
    if (seasonHome && !RESERVED_FIRST_SEGMENTS.has(seasonHome[1])) {
        const [, region, season] = seasonHome;
        return NextResponse.redirect(new URL(`/${region}/${season}`, request.url));
    }

    request.headers.set("x-pathname", pathname);
    return updateSession(request);
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
