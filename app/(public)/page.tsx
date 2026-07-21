import { Suspense } from "react";
import RedirectCleaner from "@/app/components/providers/RedirectCleaner";
import HeroSection from "@/app/components/public/landing/HeroSection";
import CVRNInfo from "@/app/components/public/landing/CVRNInfo";
import { getCachedRegions, getCachedSeasons } from "@/server/cache/publicReads";
import { logger } from "@/server/utils/logger";

export default async function PublicHome() {
    const [regions, seasons] = await Promise.all([
        getCachedRegions().catch((error) => {
            logger.error({ error }, "PublicHome: failed to load regions");
            return [];
        }),
        getCachedSeasons().catch((error) => {
            logger.error({ error }, "PublicHome: failed to load seasons");
            return [];
        }),
    ]);

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
