"use client";

import { useState, useEffect, useId } from "react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NavPage = { page: string; label: string };
type NavGroup = { label: string; children: NavPage[] };
type NavEntry = NavPage | NavGroup;

const NAV_ENTRIES: NavEntry[] = [
    { page: "home", label: "Home" },
    { page: "matches", label: "Matches" },
    { page: "standings", label: "Standings" },
    { page: "playoffs", label: "Playoffs" },
    { page: "teams", label: "Teams" },
    { page: "players", label: "Players" },
    { page: "leaderboard", label: "Leaderboard" },
    { page: "records", label: "Records" },
    {
        label: "Information",
        children: [
            { page: "spec-requirements", label: "Specs" },
            { page: "updates", label: "Updates" },
        ],
    },
    { page: "media", label: "Media" },
    { page: "archive", label: "Archive" },
];

const GLOBAL_HREFS: Record<string, string> = {
    archive: "/archive",
    players: "/players",
    records: "/records",
    "spec-requirements": "/spec-requirements",
    updates: "/updates",
};

const EXTRA_ACTIVE_PATHS: Record<string, string[]> = {
    media: ["/articles"],
};

const ITEM_BASE = cn(
    "inline-flex items-center justify-center rounded-sm text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "h-9 px-3"
);
const HORIZONTAL_ACTIVE = "text-foreground font-semibold underline decoration-2 underline-offset-[6px]";
const HORIZONTAL_INACTIVE = "text-muted-foreground hover:text-foreground hover:underline hover:decoration-2 hover:decoration-muted-foreground hover:underline-offset-[6px]";
const VERTICAL_ACTIVE = "bg-accent text-foreground font-semibold";
const VERTICAL_INACTIVE = "text-muted-foreground hover:bg-accent hover:text-foreground";

function isUnder(pathname: string, path: string): boolean {
    return pathname === path || pathname.startsWith(`${path}/`);
}

function isGroup(entry: NavEntry): entry is NavGroup {
    return "children" in entry;
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
    const groupLabelId = useId();

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
    const base = `/${params.region}/${params.season}`;
    const vertical = layout === "vertical";

    const resolve = (page: string) => {
        const globalHref = GLOBAL_HREFS[page];
        const href = globalHref
            ? globalHref
            : hasEffectiveContext
                ? page === "home"
                    ? prefix
                    : `${prefix}/${page}`
                : page === "home"
                    ? "/select"
                    : `/select?next=${page}`;
        const isActive = page === "home"
            ? pathname === (hasContext ? base : "/home")
            : isUnder(pathname, globalHref ?? `/${page}`)
                || (hasContext && isUnder(pathname, `${base}/${page}`))
                || (EXTRA_ACTIVE_PATHS[page] ?? []).some(path => isUnder(pathname, path));
        return { href, isActive };
    };

    const itemClass = (isActive: boolean, extra?: string) =>
        cn(
            ITEM_BASE,
            vertical ? "w-full justify-start" : "",
            isActive
                ? vertical ? VERTICAL_ACTIVE : HORIZONTAL_ACTIVE
                : vertical ? VERTICAL_INACTIVE : HORIZONTAL_INACTIVE,
            extra
        );

    const renderLink = (item: NavPage, extra?: string) => {
        const { href, isActive } = resolve(item.page);
        return (
            <Link
                key={item.page}
                href={href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={itemClass(isActive, extra)}
            >
                {item.label}
            </Link>
        );
    };

    const renderGroup = (group: NavGroup) => {
        const children = group.children.map(child => ({ child, ...resolve(child.page) }));
        const groupActive = children.some(c => c.isActive);

        if (vertical) {
            const labelId = `${groupLabelId}-${group.label}`;
            return (
                <div key={group.label} role="group" aria-labelledby={labelId} className="flex flex-col gap-1">
                    <span
                        id={labelId}
                        className={cn(
                            "flex h-9 items-center px-3 text-sm font-medium",
                            groupActive ? "text-foreground" : "text-muted-foreground"
                        )}
                    >
                        {group.label}
                    </span>
                    {group.children.map(child => renderLink(child, "pl-6"))}
                </div>
            );
        }

        return (
            <DropdownMenu key={group.label}>
                <DropdownMenuTrigger className={itemClass(groupActive, "gap-1")}>
                    {group.label}
                    <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="rounded-sm">
                    {children.map(({ child, href, isActive }) => (
                        <DropdownMenuItem
                            key={child.page}
                            asChild
                            className={cn("rounded-sm cursor-pointer", isActive && VERTICAL_ACTIVE)}
                        >
                            <Link
                                href={href}
                                onClick={onNavigate}
                                aria-current={isActive ? "page" : undefined}
                            >
                                {child.label}
                            </Link>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };

    return (
        <nav className={vertical ? "flex flex-col gap-1 w-full" : "hidden lg:flex gap-1"}>
            {NAV_ENTRIES.map(entry => (isGroup(entry) ? renderGroup(entry) : renderLink(entry)))}
        </nav>
    );
}
