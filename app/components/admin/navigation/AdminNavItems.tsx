"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/app/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

const FLAT_ITEMS = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/teams",     label: "Teams" },
    { href: "/admin/matches",   label: "Matches" },
    { href: "/admin/media",     label: "Media" },
];

const DROPDOWN_GROUPS = [
    {
        label: "League",
        items: [
            { href: "/admin/standings", label: "Standings" },
            { href: "/admin/seasons",   label: "Seasons" },
            { href: "/admin/playoffs",  label: "Playoffs" },
        ],
    },
    {
        label: "System",
        items: [
            { href: "/admin/sync",         label: "Sync" },
            { href: "/admin/sync/history", label: "Sync History" },
        ],
    },
];

const ALL_ITEMS = [
    ...FLAT_ITEMS,
    ...DROPDOWN_GROUPS.flatMap(g => g.items),
];

interface AdminNavItemsProps {
    layout?: "horizontal" | "vertical";
    onNavigate?: () => void;
}

export default function AdminNavItems({
    layout = "horizontal",
    onNavigate,
}: AdminNavItemsProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [, startTransition] = useTransition();

    function navigate(href: string) {
        startTransition(() => router.push(href));
        onNavigate?.();
    }

    if (layout === "vertical") {
        return (
            <nav className="flex flex-col gap-1 w-full">
                {ALL_ITEMS.map((item) => (
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
            {FLAT_ITEMS.map((item) => (
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

            {DROPDOWN_GROUPS.map((group) => {
                const isActive = group.items.some(i => pathname === i.href);
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
