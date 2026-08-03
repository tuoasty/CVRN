"use client";

import { useState, useEffect } from "react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV_PAGES = [
    { page: "home", label: "Home" },
    { page: "matches", label: "Matches" },
    { page: "standings", label: "Standings" },
    { page: "playoffs", label: "Playoffs" },
    { page: "teams", label: "Teams" },
    { page: "players", label: "Players" },
    { page: "leaderboard", label: "Leaderboard" },
    { page: "media", label: "Media" },
    { page: "archive", label: "Archive" },
];

// Pages that live outside a season. Their href never picks up the /[region]/[season]
// prefix and they stay reachable when no season context exists.
//
// The all-time board (/leaderboard) is deliberately NOT here. It is reached from the
// season leaderboard rather than the navbar — it answers a follow-up question, not a
// first one, and a tenth top-level item crowds the bar. The route stays directly
// linkable, so a shared URL still opens it.
const GLOBAL_HREFS: Record<string, string> = {
    archive: "/archive",
    players: "/players",
};

interface PublicNavItemsProps {
    layout?: "horizontal" | "vertical";
    onNavigate?: () => void;
}

export default function PublicNavItems({
    layout = "horizontal",
    onNavigate,
}: PublicNavItemsProps) {
    const pathname = usePathname();
    const params = useParams<{ region?: string; season?: string }>();
    const [fallbackCtx, setFallbackCtx] = useState<{ region: string; season: string } | null>(null);

    // The navbar lives in the persistent layout and never remounts, so a `[]` effect
    // would only ever see the cookie as it was on first load (null in a fresh incognito
    // session, even after picking a season). Re-read when the season context changes —
    // i.e. when leaving a season page (params -> undefined) we pick up the cookie that
    // RegionSeasonSelector just wrote. Intra-season navigation (matches -> standings)
    // leaves params unchanged and does not re-read.
    useEffect(() => {
        const entry = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith("cvrn_last_ctx="));
        if (entry) {
            const val = entry.slice("cvrn_last_ctx=".length);
            const [r, s] = val.split(":");
            if (r && s) setFallbackCtx({ region: r, season: s });
        }
    }, [params.region, params.season]);

    const effectiveRegion = params.region ?? fallbackCtx?.region;
    const effectiveSeason = params.season ?? fallbackCtx?.season;
    const hasContext = !!(params.region && params.season);
    const hasEffectiveContext = !!(effectiveRegion && effectiveSeason);
    const prefix = hasEffectiveContext ? `/${effectiveRegion}/${effectiveSeason}` : "";

    const navClasses =
        layout === "vertical"
            ? "flex flex-col gap-1 w-full"
            : "hidden lg:flex gap-1";

    return (
        <nav className={navClasses}>
            {NAV_PAGES.map((item) => {
                const globalHref = GLOBAL_HREFS[item.page];
                const href = globalHref
                    ? globalHref
                    : hasEffectiveContext
                        ? item.page === "home"
                            ? prefix
                            : `${prefix}/${item.page}`
                        : item.page === "home"
                            ? "/select"
                            : `/select?next=${item.page}`;
                const base = `/${params.region}/${params.season}`;
                const isActive = item.page === "players"
                    // Player detail pages live under /players/[username].
                    ? pathname.startsWith("/players")
                    : globalHref
                        ? pathname === globalHref
                        : hasContext
                            ? item.page === "home"
                                ? pathname === base
                                : pathname.startsWith(`${base}/${item.page}`)
                            : pathname === `/${item.page}`;
                return (
                    <Link
                        key={item.page}
                        href={href}
                        onClick={onNavigate}
                        className={cn(
                            "inline-flex items-center justify-center rounded-sm text-sm font-medium transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            "h-9 px-3",
                            layout === "vertical" ? "w-full justify-start" : "",
                            isActive
                                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                : "hover:bg-accent hover:text-accent-foreground"
                        )}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
