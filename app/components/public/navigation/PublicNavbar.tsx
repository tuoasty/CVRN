"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/app/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/app/components/ui/sheet";
import PublicNavItems from "@/app/components/public/navigation/PublicNavItems";
import NavbarLogo from "@/app/components/public/navigation/NavbarLogo";
import { useAccount } from "@/app/components/account/AccountMenu";
import { AccountPanel } from "@/app/components/account/AccountPanel";
import { InlineSwitch } from "@/app/components/filters/InlineSwitch";
import { IslandAvatar, NavIsland } from "@/app/components/public/navigation/island/NavIsland";
import { islandRegionFor } from "@/app/components/public/navigation/island/islandContext";

const THEME_OPTIONS = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
] as const;

type ThemeValue = (typeof THEME_OPTIONS)[number]["value"];

function SheetTheme() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Theme</span>
            {mounted && (
                <InlineSwitch<ThemeValue>
                    label="Theme"
                    options={THEME_OPTIONS}
                    value={(theme as ThemeValue | undefined) ?? "system"}
                    onChange={setTheme}
                />
            )}
        </div>
    );
}

export default function PublicNavbar() {
    const pathname = usePathname();
    const params = useParams<{ region?: string; season?: string }>();
    const account = useAccount();
    const [open, setOpen] = useState(false);
    const hasPicker = !!params.season && islandRegionFor(params.region) !== null;

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-background shadow-[0_-8px_0_0_hsl(var(--background))]">
            <div className="page-wide">
                <div className="hidden xl:flex items-center justify-between py-3">
                    <div className="flex items-center gap-6">
                        <Link href="/" aria-label="CVRN home">
                            <NavbarLogo />
                        </Link>
                        <PublicNavItems />
                    </div>
                    <NavIsland variant="desktop" />
                </div>

                <div className="xl:hidden flex items-center justify-between py-1.5">
                    <Link href="/" aria-label="CVRN home">
                        <NavbarLogo />
                    </Link>

                    <div className="flex items-center gap-1">
                        {account && (
                            <button
                                type="button"
                                aria-label={account.displayName}
                                onClick={() => setOpen(true)}
                                className="flex size-11 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground"
                            >
                                <IslandAvatar account={account} size={28} />
                            </button>
                        )}
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="size-11 p-0 rounded-sm"
                                    aria-label="Open navigation menu"
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[min(288px,calc(100vw-32px))] sm:max-w-sm">
                                <SheetHeader>
                                    <SheetTitle>CVRN</SheetTitle>
                                    <SheetDescription className="sr-only">
                                        Navigation menu
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-4 [&_button]:[font-size-adjust:inherit]">
                                    <PublicNavItems
                                        layout="vertical"
                                        onNavigate={() => setOpen(false)}
                                    />
                                    <div className="h-px bg-border" />
                                    {account && (
                                        <>
                                            <div data-open="" className="-mx-0.5">
                                                <AccountPanel account={account} size="row" onNavigate={() => setOpen(false)} />
                                            </div>
                                            <div className="h-px bg-border" />
                                        </>
                                    )}
                                    <SheetTheme />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
            {hasPicker && (
                <div className="xl:hidden page-wide pb-2">
                    <NavIsland variant="row" />
                </div>
            )}
        </header>
    );
}
