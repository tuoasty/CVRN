"use server";

import {createServerSupabase} from "@/server/supabase/server";
import {getAllRegions, getRegionByCode} from "@/server/services/region.service";

export async function getAllRegionsAction() {
    const supabase = await createServerSupabase();
    return getAllRegions(supabase)
}

export async function getRegionByCodeAction(code: string) {
    const supabase = await createServerSupabase();
    return getRegionByCode(supabase, code)
}