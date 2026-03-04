"use client";

import Link from "next/link";
import { Button } from "@/app/components/ui/button";

const NAV_ITEMS = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/teams", label: "Teams" },
    { href: "/admin/matches", label: "Matches" },
];

type AdminNavItemsProps = {
    currentPath: string;
};

export default function AdminNavItems({ currentPath }: AdminNavItemsProps) {
    return (
        <nav className="flex gap-1">
            {NAV_ITEMS.map((item) => {
                const isActive = currentPath === item.href;
                return (
                    <Link key={item.href} href={item.href}>
                        <Button
                            variant={isActive ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-sm text-sm"
                        >
                            {item.label}
                        </Button>
                    </Link>
                );
            })}
        </nav>
    );
}