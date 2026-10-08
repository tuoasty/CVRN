"use client";

import { useState, useEffect, useId } from "react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
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
    { page: "media", label: "Media" },
    { page: "archive", label: "Archive" },
    {
        label: "Information",
        children: [
            { page: "spec-requirements", label: "Specs" },
            { page: "updates", label: "Updates" },
        ],
    },
];

const PANEL_SIDE_OFFSET = 13;

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
                <DropdownMenuTrigger className={itemClass(groupActive, "group gap-1")}>
                    {group.label}
                    <ChevronDown
                        className="h-3 w-3 opacity-60 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[state=open]:rotate-180 motion-reduce:transition-none"
                        aria-hidden
                    />
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuPrimitive.Content
                        align="start"
                        sideOffset={PANEL_SIDE_OFFSET}
                        className={cn(
                            "z-50 w-80 rounded-none border border-t-0 border-border bg-card p-3 text-foreground shadow-lg outline-none",
                            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=open]:duration-200 data-[state=open]:ease-out",
                            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-150",
                            "motion-reduce:animate-none"
                        )}
                    >
                        <DropdownMenuLabel className="px-2 pb-1.5 pt-0 text-xs font-semibold text-muted-foreground">
                            {group.label}
                        </DropdownMenuLabel>
                        {children.map(({ child, href, isActive }) => (
                            <DropdownMenuItem
                                key={child.page}
                                asChild
                                className={cn(
                                    "flex cursor-pointer items-center justify-between gap-3 rounded-none p-2 transition-colors duration-150",
                                    "hover:bg-muted focus:bg-muted focus:text-foreground",
                                    isActive && "bg-muted"
                                )}
                            >
                                <Link href={href} onClick={onNavigate} aria-current={isActive ? "page" : undefined}>
                                    <span className="text-sm font-semibold text-foreground">{child.label}</span>
                                    {isActive && (
                                        <span className="text-xs font-semibold text-foreground">Here</span>
                                    )}
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuPrimitive.Content>
                </DropdownMenuPortal>
            </DropdownMenu>
        );
    };

    return (
        <nav className={vertical ? "flex flex-col gap-1 w-full" : "hidden lg:flex gap-1"}>
            {NAV_ENTRIES.map(entry => (isGroup(entry) ? renderGroup(entry) : renderLink(entry)))}
        </nav>
    );
}
