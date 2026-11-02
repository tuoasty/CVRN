"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Users } from "lucide-react";
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
import { LogoutButton } from "@/app/components/ui/LogoutButton";
import AdminNavItems from "@/app/components/admin/navigation/AdminNavItems";
import AdminRegionSeasonSelector from "@/app/components/admin/navigation/AdminRegionSeasonSelector";

export default function AdminNavbar({ userRole }: { userRole: string | null }) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    const showRegionSeasonSelector = !pathname.startsWith("/admin/teams") && pathname !== "/admin/specs" && pathname !== "/admin/overalls" && !pathname.startsWith("/admin/cards");

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-card">
            <div className="page-wide">
                {}
                <div className="hidden lg:flex items-center justify-between py-3">
                    <div className="flex items-center gap-8">
                        <Link href="/admin/dashboard">
                            <h1 className="text-lg font-semibold tracking-tight">
                                CVRN
                            </h1>
                        </Link>

                        <AdminNavItems userRole={userRole} />
                    </div>

                    <div className="flex items-center gap-3">
                        {showRegionSeasonSelector && (
                            <>
                                <AdminRegionSeasonSelector />
                                <div className="h-6 w-px bg-border" />
                            </>
                        )}
                        <ModeToggle />
                        <div className="h-6 w-px bg-border" />
                        <LogoutButton />
                        <div className="h-6 w-px bg-border" />
                        <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 sm:h-8 sm:w-8 p-0 rounded-sm"
                        >
                            <Link href="/" aria-label="Go to public site"><Users className="h-4 w-4" /></Link>
                        </Button>
                    </div>
                </div>

                {}
                <div className="lg:hidden flex items-center justify-between py-2.5">
                    <Link href="/admin/dashboard">
                        <h1 className="text-lg font-semibold tracking-tight">
                            CVRN
                        </h1>
                    </Link>

                    <div className="flex items-center gap-2">
                        <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 rounded-sm"
                        >
                            <Link href="/" aria-label="Go to public site"><Users className="h-4 w-4" /></Link>
                        </Button>
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
                                    <SheetTitle>CVRN Admin</SheetTitle>
                                    <SheetDescription className="sr-only">
                                        Admin navigation menu
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="flex flex-col gap-4 px-4 pb-4">
                                    <AdminNavItems
                                        layout="vertical"
                                        userRole={userRole}
                                        onNavigate={() => setOpen(false)}
                                    />
                                    {showRegionSeasonSelector && (
                                        <>
                                            <div className="h-px bg-border" />
                                            <AdminRegionSeasonSelector />
                                        </>
                                    )}
                                    <div className="h-px bg-border" />
                                    <LogoutButton
                                        showLabel
                                        className="w-full justify-start"
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
        </header>
    );
}
