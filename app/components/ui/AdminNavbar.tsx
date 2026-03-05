import Link from "next/link";
import { ModeToggle } from "@/app/components/ui/ModeToggle";
import { LogoutButton } from "@/app/components/ui/LogoutButton";
import AdminNavItems from "@/app/components/ui/AdminNavItems";

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

                    <div className="flex items-center gap-2">
                        <ModeToggle />
                        <LogoutButton />
                    </div>
                </div>
            </div>
        </header>
    );
}