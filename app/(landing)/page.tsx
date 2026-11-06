import {Suspense} from "react";
import RedirectCleaner from "@/app/components/providers/RedirectCleaner";
import LandingExperience, {type LandingView} from "@/app/components/public/landing/LandingExperience";
import {REPRESENTATIVES, type RepresentativeRegion} from "@/app/components/public/landing/representatives";
import {getCachedRegions, getCachedSeasons} from "@/server/cache/publicReads";
import {logger} from "@/server/utils/logger";
import {SITE_URL} from "@/app/lib/siteUrl";

const STRUCTURED_DATA = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            name: "CVRN",
            alternateName: ["CVR Network", "Confederate Volleyball Roblox Network", "CVR Volleyball"],
            url: `${SITE_URL}/`,
            publisher: {"@id": `${SITE_URL}/#organization`},
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

export default async function LandingPage({
    searchParams,
}: {
    searchParams: Promise<{view?: string}>;
}) {
    const [{view}, regions, seasons] = await Promise.all([
        searchParams,
        getCachedRegions().catch((error) => {
            logger.error({error}, "LandingPage: failed to load regions");
            return [];
        }),
        getCachedSeasons().catch((error) => {
            logger.error({error}, "LandingPage: failed to load seasons");
            return [];
        }),
    ]);

    const now = new Date();
    const regionHrefs = {} as Record<RepresentativeRegion, string>;
    for (const rep of REPRESENTATIVES) {
        const region = regions.find(r => r.code.toLowerCase() === rep.region);
        const regionSeasons = region
            ? seasons
                .filter(s => s.region_id === region.id)
                .sort((a, b) => b.start_date.localeCompare(a.start_date))
            : [];
        const target = regionSeasons.find(s => !s.end_date || new Date(s.end_date) > now) ?? regionSeasons[0];
        regionHrefs[rep.region] = target ? `/${rep.region}/${target.slug}` : "/select";
    }

    const seasonLabels: Record<string, string> = {};
    for (const s of seasons) {
        const region = regions.find(r => r.id === s.region_id);
        if (!region) continue;
        const code = region.code.toLowerCase();
        const label = REPRESENTATIVES.find(r => r.region === code)?.name ?? region.name;
        seasonLabels[`${code}:${s.slug}`] = `${label} ${s.name}`;
    }

    const initialView: LandingView = view === "league" ? "league" : "menu";

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{__html: STRUCTURED_DATA}} />
            <Suspense fallback={null}>
                <RedirectCleaner />
            </Suspense>
            <LandingExperience initialView={initialView} regionHrefs={regionHrefs} seasonLabels={seasonLabels} />
        </>
    );
}
