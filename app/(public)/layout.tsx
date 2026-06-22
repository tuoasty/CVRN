import { Suspense } from "react";
import PublicNavbar from "@/app/components/public/navigation/PublicNavbar";
import PublicFooter from "@/app/components/public/landing/PublicFooter";
import { SWRFallback } from "@/app/providers/SWRFallback";
import { getAllRegionsAction } from "@/app/actions/region.actions";
import { getAllSeasonsAction } from "@/app/actions/season.actions";

async function PublicLayoutDataProvider({ children }: { children: React.ReactNode }) {
    const [regionsResult, seasonsResult] = await Promise.all([
        getAllRegionsAction(),
        getAllSeasonsAction(),
    ]);

    const regions = regionsResult.ok ? regionsResult.value : [];
    const seasons = seasonsResult.ok ? seasonsResult.value : [];

    return (
        <SWRFallback fallback={{ regions, seasons }}>
            <main className="flex-1">{children}</main>
        </SWRFallback>
    );
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <Suspense
                fallback={
                    <header className="border-b border-border bg-card">
                        <div className="page-wide h-[52px] lg:h-[56px]" />
                        <div className="lg:hidden border-t border-border">
                            <div className="page-wide h-[52px]" />
                        </div>
                    </header>
                }
            >
                <PublicNavbar />
            </Suspense>
            <Suspense fallback={<main className="flex-1" />}>
                <PublicLayoutDataProvider>
                    {children}
                </PublicLayoutDataProvider>
            </Suspense>
            <Suspense fallback={null}>
                <PublicFooter />
            </Suspense>
        </div>
    );
}
