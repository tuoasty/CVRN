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

export default function AdminNavbar() {
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
                        <Link href="/admin/dashboard">
                            <h1 className="text-lg font-semibold tracking-tight">
                                CVRN
                            </h1>
                        </Link>

                        <AdminNavItems />
                    </div>

                    <div className="flex items-center gap-3">
                        <LogoutButton />
                        <div className="h-6 w-px bg-border" />
                        <ModeToggle />
                        <div className="h-6 w-px bg-border" />
                        <Link href="/home">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 sm:h-8 sm:w-8 p-0 rounded-sm"
                            >
                                <Users className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Mobile/Tablet: Single Row with Burger */}
                <div className="lg:hidden flex items-center justify-between py-2.5">
                    <Link href="/admin/dashboard">
                        <h1 className="text-lg font-semibold tracking-tight">
                            CVRN
                        </h1>
                    </Link>

                    <div className="flex items-center gap-2">
                        <LogoutButton />
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
                                        onNavigate={() => setOpen(false)}
                                    />
                                    <div className="h-px bg-border" />
                                    <Link
                                        href="/home"
                                        onClick={() => setOpen(false)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm hover:bg-accent"
                                    >
                                        <Users className="h-4 w-4" />
                                        <span>Public Site</span>
                                    </Link>
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
