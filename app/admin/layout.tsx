import { Suspense } from "react";
import AdminNavbar from "@/app/components/admin/navigation/AdminNavbar";
import {AdminStoreInitializer} from "@/app/admin/AdminStoreInitializier";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            <Suspense fallback={
                <header className="border-b border-border bg-card">
                    <div className="max-w-7xl mx-auto px-6 py-3 h-14" />
                </header>
            }>
                <AdminNavbar />
            </Suspense>
            <AdminStoreInitializer>
                <main className="admin-container">
                    {children}
                </main>
            </AdminStoreInitializer>
        </div>
    );
}