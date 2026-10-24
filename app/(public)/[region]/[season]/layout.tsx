import { notFound } from "next/navigation";
import {
    getCachedRegionByCode,
    getCachedSeasonBySlugAndRegion,
} from "@/server/cache/publicReads";
import { SeasonProvider } from "./context";

export async function generateStaticParams() {
    return [];
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
