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

    return updateSession(request);
}

// Scoped deliberately: updateSession() is a Supabase auth round-trip and only /admin and
// /auth need it. The remaining entries exist solely so the legacy redirects above still
// fire. A catch-all matcher here runs on every public page view, every server action POST
// and every prefetch — which is pure invocation cost on traffic that has no session.
export const config = {
    matcher: [
        // Session refresh
        "/admin/:path*",
        "/auth/:path*",
        // Legacy flat list routes → "/"
        "/home",
        "/matches",
        "/standings",
        "/teams",
        "/playoffs",
        "/media",
        // Legacy detail routes → nested equivalents
        "/matches/:region/:season/:code/:teams",
        "/teams/:region/:season/:teamName",
        "/archive/:region/:slug",
        // Legacy season home → bare season path
        "/:region/:season/home",
    ],
};
