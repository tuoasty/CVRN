"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/app/components/ui/select";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
    { href: "/home", label: "Home" },
    { href: "/matches", label: "Matches" },
    { href: "/standings", label: "Standings" },
    { href: "/playoffs", label: "Playoffs" },
    { href: "/teams", label: "Teams" },
];

export default function PublicNavItems() {
    const pathname = usePathname();
    const router = useRouter();

    const currentItem = NAV_ITEMS.find((item) => pathname === item.href);

    return (
        <>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-1">
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

            {/* Mobile Navigation Dropdown */}
            <Select
                value={pathname}
                onValueChange={(value) => router.push(value)}
            >
                <SelectTrigger className="md:hidden w-[140px] h-8 rounded-sm text-sm">
                    <SelectValue>
                        {currentItem?.label || "Navigate"}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                    {NAV_ITEMS.map((item) => (
                        <SelectItem
                            key={item.href}
                            value={item.href}
                            className="rounded-sm text-sm"
                        >
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </>
    );
}