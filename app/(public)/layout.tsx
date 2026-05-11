import { Suspense } from "react";
import PublicNavbar from "@/app/components/public/navigation/PublicNavbar";
import PublicFooter from "@/app/components/public/landing/PublicFooter";
import { PublicStoreInitializer } from "@/app/(public)/PublicStoreInitializer";
import RegionSeasonSelector from "@/app/components/ui/RegionSeasonSelector";

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
            <div className="lg:hidden border-b border-border bg-card">
                <div className="page-wide py-2">
                    <Suspense fallback={<div className="h-9" />}>
                        <RegionSeasonSelector />
                    </Suspense>
                </div>
            </div>
            <PublicStoreInitializer>
                <main className="flex-1">{children}</main>
            </PublicStoreInitializer>
            <PublicFooter />
        </div>
    );
}
