import { notFound } from "next/navigation";
import {
    getCachedRegionByCode,
    getCachedRegions,
    getCachedSeasons,
    getCachedSeasonBySlugAndRegion,
} from "@/server/cache/publicReads";
import { logger } from "@/server/utils/logger";
import { SeasonProvider } from "./context";

export async function generateStaticParams() {
    try {
        const [regions, seasons] = await Promise.all([getCachedRegions(), getCachedSeasons()]);
        const regionById = new Map(regions.map((r) => [r.id, r]));

        return seasons.flatMap((season) => {
            const region = regionById.get(season.region_id);
            if (!region?.code || !season.slug) return [];
            return [{ region: region.code.toLowerCase(), season: season.slug }];
        });
    } catch (error) {
        logger.error({ error }, "generateStaticParams: falling back to on-demand rendering");
        return [];
    }
}

export default async function RegionSeasonLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ region: string; season: string }>;
}) {
    const { region: regionCode, season: seasonSlug } = await params;

    const region = await getCachedRegionByCode(regionCode);
    if (!region) return notFound();

    const season = await getCachedSeasonBySlugAndRegion(seasonSlug, region.id);
    if (!season) return notFound();

    return (
        <SeasonProvider season={season} region={region}>
            {children}
        </SeasonProvider>
    );
}
