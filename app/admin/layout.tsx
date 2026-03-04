import { Suspense } from "react";
import AdminNavbar from "@/app/components/ui/AdminNavbar";

export default function AdminLayout({
                                        children,
                                    }: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-background">
            <Suspense fallback={<div className="h-14 border-b border-border bg-card" />}>
                <AdminNavbar />
            </Suspense>
            <main className="admin-container">
                {children}
            </main>
        </div>
    );
}