import { notFound } from "next/navigation";
import { createServerSupabase } from "@/server/supabase/server";
import { getRegionByCode } from "@/server/domains/region";
import { getSeasonBySlugAndRegion } from "@/server/domains/season";
import { SeasonProvider } from "./context";

export default async function RegionSeasonLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ region: string; season: string }>;
}) {
    const { region: regionCode, season: seasonSlug } = await params;
    const supabase = await createServerSupabase();

    const regionResult = await getRegionByCode(supabase, regionCode);
    if (!regionResult.ok) return notFound();

    const seasonResult = await getSeasonBySlugAndRegion(supabase, seasonSlug, regionResult.value.id);
    if (!seasonResult.ok) return notFound();

    return (
        <SeasonProvider season={seasonResult.value} region={regionResult.value}>
            {children}
        </SeasonProvider>
    );
}
