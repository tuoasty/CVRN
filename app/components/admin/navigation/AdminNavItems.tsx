"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

type NavItem = { href: string; label: string; superAdminOnly?: boolean };

const FLAT_ITEMS: NavItem[] = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/teams",     label: "Teams" },
    { href: "/admin/matches",   label: "Matches" },
    { href: "/admin/media",     label: "Media" },
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
    const router = useRouter();

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

    function navigate(href: string) {
        router.push(href);
        onNavigate?.();
    }

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
                        variant={pathname === item.href ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start rounded-sm text-sm"
                        onClick={() => navigate(item.href)}
                    >
                        {item.label}
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
                    variant={pathname === item.href ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-sm text-sm"
                    onClick={() => navigate(item.href)}
                >
                    {item.label}
                </Button>
            ))}

            {visibleDropdownGroups.map((group) => {
                const isActive = group.items.some(i => pathname === i.href);

                if (group.items.length === 1) {
                    const item = group.items[0];
                    return (
                        <Button
                            key={item.href}
                            variant={pathname === item.href ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-sm text-sm"
                            onClick={() => navigate(item.href)}
                        >
                            {item.label}
                        </Button>
                    );
                }

                return (
                    <DropdownMenu key={group.label}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant={isActive ? "secondary" : "ghost"}
                                size="sm"
                                className="rounded-sm text-sm gap-1"
                            >
                                {group.label}
                                <ChevronDown className="h-3 w-3 opacity-60" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="rounded-sm">
                            {group.items.map((item) => (
                                <DropdownMenuItem
                                    key={item.href}
                                    className={`rounded-sm cursor-pointer ${pathname === item.href ? "bg-secondary" : ""}`}
                                    onClick={() => navigate(item.href)}
                                >
                                    {item.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            })}
        </nav>
    );
}
