"use server";

import { createServerSupabase } from "@/server/supabase/server";
import { getAllSeasons, getSeasonBySlugAndRegion } from "@/server/services/season.service";

export async function getAllSeasonsAction() {
    const supabase = await createServerSupabase();
    return getAllSeasons(supabase);
}

export async function getSeasonBySlugAndRegionAction(p: {
    slug: string;
    regionId: string;
}) {
    const supabase = await createServerSupabase();
    return getSeasonBySlugAndRegion(supabase, p.slug, p.regionId);
}