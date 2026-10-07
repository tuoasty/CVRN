import { Suspense } from "react";
import RedirectCleaner from "@/app/components/providers/RedirectCleaner";
import HeroSection from "@/app/components/public/landing/HeroSection";
import CVRNInfo from "@/app/components/public/landing/CVRNInfo";
import { getCachedRegions, getCachedSeasons } from "@/server/cache/publicReads";
import { logger } from "@/server/utils/logger";
import { SITE_URL } from "@/app/lib/siteUrl";

const STRUCTURED_DATA = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            name: "CVRN",
            alternateName: ["CVR Network", "Confederate Volleyball Roblox Network", "CVR Volleyball"],
            url: `${SITE_URL}/`,
            publisher: { "@id": `${SITE_URL}/#organization` },
        },
        {
            "@type": "SportsOrganization",
            "@id": `${SITE_URL}/#organization`,
            name: "Confederate Volleyball Roblox Network",
            alternateName: ["CVRN", "CVR Network", "CVR", "CVR Roblox", "CVR Volleyball"],
            sport: "Volleyball",
            url: `${SITE_URL}/`,
            logo: `${SITE_URL}/logo-dark.png`,
            sameAs: [
                "https://www.roblox.com/games/79010415692181/CVR-Retro",
                "https://discord.gg/bXtNACsuWF",
            ],
        },
    ],
}).replace(/</g, "\\u003c");

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
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: STRUCTURED_DATA }} />
            <Suspense fallback={null}>
                <RedirectCleaner />
            </Suspense>
            <HeroSection />
            <CVRNInfo byRegion={byRegion} />
        </>
    );
}
