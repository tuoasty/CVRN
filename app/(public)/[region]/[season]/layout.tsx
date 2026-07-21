import { notFound } from "next/navigation";
import {
    getCachedRegionByCode,
    getCachedRegions,
    getCachedSeasons,
    getCachedSeasonBySlugAndRegion,
} from "@/server/cache/publicReads";
import { logger } from "@/server/utils/logger";
import { SeasonProvider } from "./context";

/**
 * Prerender every known region/season pair at build time.
 *
 * Without this, Next has no way to know which params exist and every season route is
 * rendered on demand. The set is small (regions x seasons), so prerendering all of them
 * is cheap. Params created after a build still work — `dynamicParams` defaults to true,
 * so unknown pairs render on first request and are then cached.
 *
 * Deliberately fails soft: a build should not break because the database was briefly
 * unreachable. Returning [] just means nothing is prerendered.
 */
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

/**
 * Wraps all 10 routes under /[region]/[season]. Like the (public) layout above it, this
 * must stay free of Dynamic APIs — it previously called `createServerSupabase()`, whose
 * `cookies()` access forced every season route to render per-request.
 *
 * The cached readers return `null` only for a genuine miss and throw on infrastructure
 * failure, so a Supabase outage surfaces as an error boundary rather than being cached
 * as a permanent 404.
 */
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
