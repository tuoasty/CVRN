"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/app/components/ui/button";

const NAV_ITEMS = [
    { href: "/home", label: "Home" },
    { href: "/matches", label: "Matches" },
    { href: "/standings", label: "Standings" },
    { href: "/playoffs", label: "Playoffs" },
    { href: "/teams", label: "Teams" },
];

export default function PublicNavItems() {
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