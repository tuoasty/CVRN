"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { href: "/home", label: "Home" },
    { href: "/matches", label: "Matches" },
    { href: "/standings", label: "Standings" },
    { href: "/playoffs", label: "Playoffs" },
    { href: "/teams", label: "Teams" },
    { href: "/media", label: "Media" },
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

    const navClasses =
        layout === "vertical"
            ? "flex flex-col gap-1 w-full"
            : "hidden lg:flex gap-1";

    return (
        <nav className={navClasses}>
            {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                            "inline-flex items-center justify-center rounded-sm text-sm font-medium transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            "h-9 px-3",
                            layout === "vertical" ? "w-full justify-start" : "",
                            isActive
                                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                : "hover:bg-accent hover:text-accent-foreground"
                        )}
                    >
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}
