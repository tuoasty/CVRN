import {Suspense} from "react";
import {cookies} from "next/headers";
import RedirectCleaner from "@/app/components/providers/RedirectCleaner";
import LandingExperience from "@/app/components/public/landing/LandingExperience";
import {pickRegionTargets, resolveContinue} from "@/app/components/public/landing/landingData";
import {buildRepresentativeCard, type RepresentativeCard} from "@/app/components/public/landing/representativeCard";
import {REPRESENTATIVES, type RepresentativeRegion} from "@/app/components/public/landing/representatives";
import {getCachedPlayerDetail, getCachedRegions, getCachedSeasons} from "@/server/cache/publicReads";
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

export default async function LandingPage() {
    const [cookieStore, regions, seasons, details] = await Promise.all([
        cookies(),
        getCachedRegions().catch((error) => {
            logger.error({error}, "LandingPage: failed to load regions");
            return [];
        }),
        getCachedSeasons().catch((error) => {
            logger.error({error}, "LandingPage: failed to load seasons");
            return [];
        }),
        Promise.all(REPRESENTATIVES.map(rep =>
            getCachedPlayerDetail(rep.player.username).catch((error) => {
                logger.error({error, username: rep.player.username}, "LandingPage: failed to load representative");
                return null;
            }),
        )),
    ]);

    const cards = Object.fromEntries(
        REPRESENTATIVES.map((rep, i) => [rep.region, buildRepresentativeCard(rep.player, details[i])]),
    ) as Record<RepresentativeRegion, RepresentativeCard>;

    const regionTargets = pickRegionTargets(regions, seasons, new Date());
    const continueLink = resolveContinue(cookieStore.get("cvrn_last_ctx")?.value, regions, seasons);

    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{__html: STRUCTURED_DATA}} />
            <Suspense fallback={null}>
                <RedirectCleaner />
            </Suspense>
            <LandingExperience regionTargets={regionTargets} continueLink={continueLink} cards={cards} />
        </>
    );
}
