import { Suspense } from "react";
import AdminNavbar from "@/app/components/admin/navigation/AdminNavbar";
import { AdminStoreInitializer } from "@/app/admin/AdminStoreInitializier";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Suspense fallback={
                <header className="border-b border-border bg-card">
                    <div className="page-wide h-14" />
                </header>
            }>
                <AdminNavbar />
            </Suspense>
            <AdminStoreInitializer>
                <main className="flex-1">{children}</main>
            </AdminStoreInitializer>
        </div>
    );
}
