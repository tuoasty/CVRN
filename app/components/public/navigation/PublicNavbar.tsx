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
import NavbarLogo from "@/app/components/public/navigation/NavbarLogo";
import RegionSeasonSelector from "@/app/components/ui/RegionSeasonSelector";
import { AccountMenu } from "@/app/components/account/AccountMenu";
import { NavIsland } from "@/app/components/public/navigation/island/NavIsland";

export default function PublicNavbar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-background">
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

                <div className="xl:hidden flex items-center justify-between py-2.5">
                    <Link href="/" aria-label="CVRN home">
                        <NavbarLogo />
                    </Link>

                    <div className="flex items-center gap-2">
                        <AccountMenu variant="public" />
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
                            <SheetContent side="right" className="w-[min(288px,calc(100vw-32px))] sm:max-w-sm">
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
            <div className="xl:hidden border-t border-border">
                <div className="page-wide py-2">
                    <RegionSeasonSelector fullWidth />
                </div>
            </div>
        </header>
    );
}
