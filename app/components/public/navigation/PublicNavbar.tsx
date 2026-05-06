"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/app/components/ui/sheet";
import { ModeToggle } from "@/app/components/ui/ModeToggle";
import PublicNavItems from "@/app/components/public/navigation/PublicNavItems";
import RegionSeasonSelector from "@/app/components/ui/RegionSeasonSelector";
import UserButton from "@/app/components/ui/UserButton";

export default function PublicNavbar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-card">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                {/* Desktop: Single Row */}
                <div className="hidden lg:flex items-center justify-between py-3">
                    <div className="flex items-center gap-8">
                        <Link href="/">
                            <h1 className="text-lg font-semibold tracking-tight">
                                CVRN
                            </h1>
                        </Link>
                        <PublicNavItems />
                    </div>

                    <div className="flex items-center gap-3">
                        <RegionSeasonSelector />
                        <div className="h-6 w-px bg-border" />
                        <ModeToggle />
                        <div className="h-6 w-px bg-border" />
                        <UserButton />
                    </div>
                </div>

                {/* Mobile/Tablet: Single Row with Burger */}
                <div className="lg:hidden flex items-center justify-between py-2.5">
                    <Link href="/">
                        <h1 className="text-lg font-semibold tracking-tight">
                            CVRN
                        </h1>
                    </Link>

                    <div className="flex items-center gap-2">
                        <UserButton />
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-10 w-10 p-0 rounded-sm"
                                    aria-label="Open navigation menu"
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-72 sm:max-w-sm">
                                <SheetHeader>
                                    <SheetTitle>CVRN</SheetTitle>
                                    <SheetDescription className="sr-only">
                                        Navigation menu
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="flex flex-col gap-4 px-4 pb-4">
                                    <PublicNavItems
                                        layout="vertical"
                                        onNavigate={() => setOpen(false)}
                                    />
                                    <div className="h-px bg-border" />
                                    <RegionSeasonSelector />
                                    <div className="h-px bg-border" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">
                                            Theme
                                        </span>
                                        <ModeToggle />
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </header>
    );
}
