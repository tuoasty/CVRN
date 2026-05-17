"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/app/components/ui/button";
import { useRouter } from "next/navigation";
const NAV_ITEMS = [
    { href: "/home", label: "Home" },
    { href: "/matches", label: "Matches" },
    { href: "/standings", label: "Standings" },
    { href: "/playoffs", label: "Playoffs" },
    { href: "/teams", label: "Teams" },
    { href: "/archive", label: "Archive" },
];

interface PublicNavItemsProps {
    layout?: "horizontal" | "vertical";
    onNavigate?: () => void;
}

export default function PublicNavItems({
    layout = "horizontal",
    onNavigate,
}: PublicNavItemsProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [, startTransition] = useTransition();

    const navClasses =
        layout === "vertical"
            ? "flex flex-col gap-1 w-full"
            : "hidden lg:flex gap-1";

    const buttonClasses =
        layout === "vertical"
            ? "w-full justify-start rounded-sm text-sm"
            : "rounded-sm text-sm";

    return (
        <nav className={navClasses}>
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Button
                            key={item.href}
                            variant={isActive ? "secondary" : "ghost"}
                            size="sm"
                            className={buttonClasses}
                            onClick={() => {
                                startTransition(() => {
                                    router.push(item.href);
                                });
                                onNavigate?.();
                            }}
                        >
                            {item.label}
                        </Button>
                    );
                })}
            </nav>
    );
}
