"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIVE_UNDERLINE = "text-foreground font-semibold underline decoration-2 underline-offset-[6px]";
const ACTIVE_FILL = "bg-accent text-foreground font-semibold";
const INACTIVE = "text-muted-foreground";
const HOVER_UNDERLINE = "hover:bg-transparent dark:hover:bg-transparent hover:text-foreground hover:underline hover:decoration-2 hover:decoration-muted-foreground hover:underline-offset-[6px]";

type NavItem = { href: string; label: string; superAdminOnly?: boolean };

const FLAT_ITEMS: NavItem[] = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/teams",     label: "Teams" },
    { href: "/admin/matches",   label: "Matches" },
    { href: "/admin/media",     label: "Media" },
    { href: "/admin/articles",  label: "Articles" },
    { href: "/admin/updates",   label: "Updates" },
    { href: "/admin/game-data", label: "Game Data" },
];

const DROPDOWN_GROUPS: { label: string; items: NavItem[] }[] = [
    {
        label: "League",
        items: [
            { href: "/admin/standings", label: "Standings" },
            { href: "/admin/seasons",   label: "Seasons" },
            { href: "/admin/playoffs",  label: "Playoffs" },
            { href: "/admin/specs",     label: "Specs" },
            { href: "/admin/specs/qualify", label: "Spec Calibration" },
        ],
    },
    {
        label: "System",
        items: [
            { href: "/admin/stats",        label: "Match Stats" },
            { href: "/admin/sync",         label: "Sync" },
            { href: "/admin/sync/history", label: "Sync History" },

            { href: "/admin/cache",        label: "Cache", superAdminOnly: true },
        ],
    },
];

const ALLOWED_HREFS: Record<string, Set<string>> = {
    stat_tracker: new Set(["/admin/sync/history"]),
    staff:        new Set(["/admin/teams", "/admin/sync/history"]),
    spec_manager: new Set(["/admin/specs", "/admin/specs/qualify"]),
};

interface AdminNavItemsProps {
    layout?: "horizontal" | "vertical";
    userRole?: string | null;
    onNavigate?: () => void;
}

export default function AdminNavItems({
    layout = "horizontal",
    userRole,
    onNavigate,
}: AdminNavItemsProps) {
    const pathname = usePathname();

    const allowed = userRole ? ALLOWED_HREFS[userRole] : undefined;
    const isSuperAdmin = userRole === "super_admin";

    const canSee = (item: NavItem) =>
        (!allowed || allowed.has(item.href)) &&
        (!item.superAdminOnly || isSuperAdmin);

    const visibleFlatItems = FLAT_ITEMS.filter(canSee);

    const visibleDropdownGroups = DROPDOWN_GROUPS.map(group => ({
        ...group,
        items: group.items.filter(canSee),
    })).filter(group => group.items.length > 0);

    const allVisibleItems = [
        ...visibleFlatItems,
        ...visibleDropdownGroups.flatMap(g => g.items),
    ];

    if (layout === "vertical") {
        return (
            <nav className="flex flex-col gap-1 w-full">
                {allVisibleItems.map((item) => (
                    <Button
                        key={item.href}
                        asChild
                        variant="ghost"
                        size="sm"
                        className={cn("w-full justify-start rounded-sm text-sm", pathname === item.href ? ACTIVE_FILL : INACTIVE)}
                    >
                        <Link href={item.href} onClick={onNavigate}>{item.label}</Link>
                    </Button>
                ))}
            </nav>
        );
    }

    return (
        <nav className="hidden lg:flex gap-1">
            {visibleFlatItems.map((item) => (
                <Button
                    key={item.href}
                    asChild
                    variant="ghost"
                    size="sm"
                    className={cn("rounded-sm text-sm", pathname === item.href ? ACTIVE_UNDERLINE : cn(INACTIVE, HOVER_UNDERLINE))}
                >
                    <Link href={item.href}>{item.label}</Link>
                </Button>
            ))}

            {visibleDropdownGroups.map((group) => {
                const isActive = group.items.some(i => pathname === i.href);

                if (group.items.length === 1) {
                    const item = group.items[0];
                    return (
                        <Button
                            key={item.href}
                            asChild
                            variant="ghost"
                            size="sm"
                            className={cn("rounded-sm text-sm", pathname === item.href ? ACTIVE_UNDERLINE : cn(INACTIVE, HOVER_UNDERLINE))}
                        >
                            <Link href={item.href}>{item.label}</Link>
                        </Button>
                    );
                }

                return (
                    <DropdownMenu key={group.label}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn("rounded-sm text-sm gap-1", isActive ? ACTIVE_UNDERLINE : cn(INACTIVE, HOVER_UNDERLINE))}
                            >
                                {group.label}
                                <ChevronDown className="h-3 w-3 opacity-60" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="rounded-sm">
                            {group.items.map((item) => (
                                <DropdownMenuItem
                                    key={item.href}
                                    asChild
                                    className={cn("rounded-sm cursor-pointer", pathname === item.href && ACTIVE_FILL)}
                                >
                                    <Link href={item.href}>{item.label}</Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            })}
        </nav>
    );
}
