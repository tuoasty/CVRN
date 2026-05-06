"use server"

import {createServerSupabase} from "@/server/supabase/server";
import {Err} from "@/shared/types/result";
import {getAllSeasons, getSeasonBySlugAndRegion} from "@/server/domains/season";
import {SeasonSlugRegionSchema} from "@/server/domains/season";

export async function getAllSeasonsAction() {
    const supabase = await createServerSupabase();
    return getAllSeasons(supabase);
}

export async function getSeasonBySlugAndRegionAction(input: unknown) {
    const parsed = SeasonSlugRegionSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getSeasonBySlugAndRegion(supabase, parsed.data.slug, parsed.data.regionId);
}
