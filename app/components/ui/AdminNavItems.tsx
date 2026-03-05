"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/app/components/ui/button";

const NAV_ITEMS = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/teams", label: "Teams" },
    { href: "/admin/matches", label: "Matches" },
    { href: "/admin/standings", label: "Standings"},
    { href: "/admin/playoffs", label: "Playoffs"}
];

export default function AdminNavItems() {
    const pathname = usePathname();

    return (
        <nav className="flex gap-1">
            {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
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