"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { ModeToggle } from "@/app/components/ui/ModeToggle";
import { LogoutButton } from "@/app/components/ui/LogoutButton";

const NAV_ITEMS = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/teams", label: "Teams" },
    { href: "/admin/matches", label: "Matches" },
];

export default function AdminNavbar() {
    const pathname = usePathname();

    return (
        <header className="border-b border-border bg-card">
            <div className="max-w-7xl mx-auto px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/admin/dashboard">
                            <h1 className="text-lg font-semibold tracking-tight">
                                CVRN
                            </h1>
                        </Link>

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
                    </div>

                    <div className="flex items-center gap-2">
                        <ModeToggle />
                        <LogoutButton />
                    </div>
                </div>
            </div>
        </header>
    );
}