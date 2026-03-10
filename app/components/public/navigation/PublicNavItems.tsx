"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
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
    const [isPending, startTransition] = useTransition();

    const currentItem = NAV_ITEMS.find((item) => pathname === item.href);

    return (
        <>
            {isPending && (
                <div className="fixed top-[80px] left-0 right-0 bottom-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            )}

            <nav className="hidden md:flex gap-1">
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

            <Select
                value={pathname}
                onValueChange={(value) => {
                    startTransition(() => {
                        router.push(value);
                    });
                }}
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