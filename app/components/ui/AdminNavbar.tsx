import Link from "next/link";
import { ModeToggle } from "@/app/components/ui/ModeToggle";
import { LogoutButton } from "@/app/components/ui/LogoutButton";
import AdminNavItems from "@/app/components/ui/AdminNavItems";
import { Users } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export default function AdminNavbar() {
    return (
        <header className="sticky top-0 z-50 border-b border-border bg-card">
            <div className="max-w-7xl mx-auto px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/admin/dashboard">
                            <h1 className="text-lg font-semibold tracking-tight">
                                CVRN
                            </h1>
                        </Link>

                        <AdminNavItems />
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/home">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 rounded-sm"
                            >
                                <Users className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div className="h-6 w-px bg-border" />
                        <ModeToggle />
                        <LogoutButton />
                    </div>
                </div>
            </div>
        </header>
    );
}