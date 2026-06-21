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
    { page: "media", label: "Media" },
    { page: "archive", label: "Archive" },
];

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
    }, []);

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
                const href = item.page === "archive"
                    ? "/archive"
                    : hasEffectiveContext
                        ? `${prefix}/${item.page}`
                        : "/#view-league";
                const isActive = hasContext
                    ? pathname.startsWith(`/${params.region}/${params.season}/${item.page}`)
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
