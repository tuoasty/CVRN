import { Suspense } from "react";
import RedirectCleaner from "@/app/components/providers/RedirectCleaner";
import HeroSection from "@/app/components/public/landing/HeroSection";
import CVRNInfo from "@/app/components/public/landing/CVRNInfo";
import { getAllSeasonsAction } from "@/app/actions/season.actions";
import { getAllRegionsAction } from "@/app/actions/region.actions";

export default async function PublicHome() {
    const [regionsResult, seasonsResult] = await Promise.all([
        getAllRegionsAction(),
        getAllSeasonsAction(),
    ]);

    const regions = regionsResult.ok ? regionsResult.value : [];
    const seasons = seasonsResult.ok ? seasonsResult.value : [];

    const active = seasons.filter(s => !s.end_date || new Date(s.end_date) > new Date());

    const byRegion = regions
        .map(r => ({
            region: r,
            seasons: active
                .filter(s => s.region_id === r.id)
        }))
        .filter(g => g.seasons.length > 0);

    return (
        <>
            <Suspense fallback={null}>
                <RedirectCleaner />
            </Suspense>
            <HeroSection />
            <CVRNInfo byRegion={byRegion} />
        </>
    );
}
