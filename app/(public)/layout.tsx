import { Suspense } from "react";
import { cookies } from "next/headers";
import PublicNavbar from "@/app/components/public/navigation/PublicNavbar";
import PublicFooter from "@/app/components/public/landing/PublicFooter";
import { PublicStoreInitializer } from "@/app/(public)/PublicStoreInitializer";
import MobileSeasonBar from "@/app/components/ui/MobileSeasonBar";
import { SWRFallback } from "@/app/providers/SWRFallback";
import { getAllRegionsAction } from "@/app/actions/region.actions";
import { getAllSeasonsAction } from "@/app/actions/season.actions";

const SEASON_COOKIE = "cvrn_selected_season";

async function PublicLayoutDataProvider({
    savedSeasonId,
    children,
}: {
    savedSeasonId: string | null;
    children: React.ReactNode;
}) {
    const [regionsResult, seasonsResult] = await Promise.all([
        getAllRegionsAction(),
        getAllSeasonsAction(),
    ]);

    const regions = regionsResult.ok ? regionsResult.value : [];
    const seasons = seasonsResult.ok ? seasonsResult.value : [];

    // Mirror initializeDefaults logic from publicContextStore
    let initialSeasonId: string | null = null;
    let initialRegionId: string | null = null;

    if (regions.length > 0 && seasons.length > 0) {
        if (savedSeasonId) {
            const saved = seasons.find(s => s.id === savedSeasonId);
            if (saved) {
                initialSeasonId = saved.id;
                initialRegionId = saved.region_id;
            }
        }

        if (!initialSeasonId) {
            const asiaRegion = regions.find(r => r.code.toUpperCase() === "AS");
            const defaultRegion = asiaRegion ?? regions[0];
            const activeSeason = seasons.find(s => s.region_id === defaultRegion.id && s.is_active);
            const fallbackSeason = seasons
                .filter(s => s.region_id === defaultRegion.id)
                .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];
            const selected = activeSeason ?? fallbackSeason;
            if (selected) {
                initialSeasonId = selected.id;
                initialRegionId = selected.region_id;
            }
        }
    }

    return (
        <SWRFallback fallback={{ regions, seasons }}>
            <PublicStoreInitializer initialSeasonId={initialSeasonId} initialRegionId={initialRegionId}>
                <main className="flex-1">{children}</main>
            </PublicStoreInitializer>
        </SWRFallback>
    );
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const savedSeasonId = cookieStore.get(SEASON_COOKIE)?.value ?? null;

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
            <Suspense fallback={<main className="flex-1" />}>
                <PublicLayoutDataProvider savedSeasonId={savedSeasonId}>
                    {children}
                </PublicLayoutDataProvider>
            </Suspense>
            <Suspense fallback={null}>
                <PublicFooter />
            </Suspense>
        </div>
    );
}
