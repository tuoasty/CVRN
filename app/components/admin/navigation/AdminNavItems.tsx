"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/app/components/ui/button";
import { useRouter } from "next/navigation";
import LoadingComponent from "@/app/components/ui/LoadingComponent";

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
            <LoadingComponent isPending={isPending}/>
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