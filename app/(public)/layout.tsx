import { Suspense } from "react";
import PublicNavbar from "@/app/components/public/navigation/PublicNavbar";
import PublicFooter from "@/app/components/public/landing/PublicFooter";
import { PublicStoreInitializer } from "@/app/(public)/PublicStoreInitializer";
import MobileSeasonBar from "@/app/components/ui/MobileSeasonBar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Suspense
                fallback={
                    <header className="border-b border-border bg-card">
                        <div className="page-wide h-14" />
                    </header>
                }
            >
                <PublicNavbar />
            </Suspense>
            <Suspense fallback={<div className="lg:hidden border-b border-border bg-card"><div className="page-wide h-[52px]" /></div>}>
                <MobileSeasonBar />
            </Suspense>
            <PublicStoreInitializer>
                <main className="flex-1">{children}</main>
            </PublicStoreInitializer>
            <Suspense fallback={null}>
                <PublicFooter />
            </Suspense>
        </div>
    );
}
