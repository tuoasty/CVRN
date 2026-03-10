"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/app/components/ui/button";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/teams", label: "Teams" },
    { href: "/admin/matches", label: "Matches" },
    { href: "/admin/standings", label: "Standings"},
    { href: "/admin/playoffs", label: "Playoffs"}
];

export default function AdminNavItems() {
    const pathname = usePathname();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    return (
        <>
            {isPending && (
                <div className="fixed top-[80px] left-0 right-0 bottom-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            )}

            <nav className="flex gap-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Button
                            key={item.href}
                            variant={isActive ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-sm text-sm"
                            onClick={() => {
                                startTransition(() => {
                                    router.push(item.href);
                                });
                            }}
                        >
                            {item.label}
                        </Button>
                    );
                })}
            </nav>
        </>
    );
}