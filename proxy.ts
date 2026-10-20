import { NextResponse } from "next/server";
import { updateSession } from "@/server/supabase/middleware";
import type { NextRequest } from "next/server";

const FLAT_LIST_ROUTES = new Set(["/home", "/matches", "/standings", "/teams", "/playoffs", "/media"]);

const RESERVED_FIRST_SEGMENTS = new Set(["matches", "teams", "archive", "players", "auth", "admin", "select"]);

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (FLAT_LIST_ROUTES.has(pathname)) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    const matchDetail = pathname.match(/^\/matches\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (matchDetail) {
        const [, region, season, code, teams] = matchDetail;
        return NextResponse.redirect(new URL(`/${region}/${season}/matches/${code}/${teams}`, request.url));
    }

    const teamDetail = pathname.match(/^\/teams\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (teamDetail) {
        const [, region, season, teamName] = teamDetail;
        return NextResponse.redirect(new URL(`/${region}/${season}/teams/${teamName}`, request.url));
    }

    const archiveDetail = pathname.match(/^\/archive\/([^/]+)\/([^/]+)$/);
    if (archiveDetail) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    const seasonHome = pathname.match(/^\/([^/]+)\/([^/]+)\/home$/);
    if (seasonHome && !RESERVED_FIRST_SEGMENTS.has(seasonHome[1])) {
        const [, region, season] = seasonHome;
        return NextResponse.redirect(new URL(`/${region}/${season}`, request.url));
    }

    return updateSession(request);
}

export const config = {
    matcher: [

        "/admin/:path*",
        "/auth/:path*",

        "/home",
        "/matches",
        "/standings",
        "/teams",
        "/playoffs",
        "/media",

        "/matches/:region/:season/:code/:teams",
        "/teams/:region/:season/:teamName",
        "/archive/:region/:slug",

        "/:region/:season/home",

        "/information/:path*",
    ],
};
