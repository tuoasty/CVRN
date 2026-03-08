import { Suspense } from "react";
import PublicNavbar from "@/app/components/ui/PublicNavbar";
import {PublicStoreInitializer} from "@/app/(public)/PublicStoreInitializer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            <Suspense
                fallback={
                    <header className="border-b border-border bg-card">
                        <div className="max-w-7xl mx-auto px-6 py-3 h-14" />
                    </header>
                }
            >
                <PublicNavbar />
            </Suspense>
            <PublicStoreInitializer>
                <main className="user-container">{children}</main>
            </PublicStoreInitializer>
        </div>
    );
}