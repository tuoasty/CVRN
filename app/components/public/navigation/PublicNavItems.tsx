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
    { page: "spec-requirements", label: "Specs" },
    { page: "updates", label: "Updates" },
    { page: "media", label: "Media" },
    { page: "archive", label: "Archive" },
];

const GLOBAL_HREFS: Record<string, string> = {
    archive: "/archive",
    players: "/players",
    "spec-requirements": "/spec-requirements",
    updates: "/updates",
};

const EXTRA_ACTIVE_PATHS: Record<string, string[]> = {
    media: ["/articles"],
};

function isUnder(pathname: string, path: string): boolean {
    return pathname === path || pathname.startsWith(`${path}/`);
}

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
                const isActive = item.page === "home"
                    ? pathname === (hasContext ? base : "/home")
                    : isUnder(pathname, globalHref ?? `/${item.page}`)
                        || (hasContext && isUnder(pathname, `${base}/${item.page}`))
                        || (EXTRA_ACTIVE_PATHS[item.page] ?? []).some(path => isUnder(pathname, path));
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
                                ? layout === "vertical"
                                    ? "bg-accent text-foreground font-semibold"
                                    : "text-foreground font-semibold underline decoration-2 underline-offset-[6px]"
                                : layout === "vertical"
                                    ? "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:underline hover:decoration-2 hover:decoration-muted-foreground hover:underline-offset-[6px]"
                        )}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
