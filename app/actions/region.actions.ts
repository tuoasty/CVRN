"use server";

import {createServerSupabase} from "@/server/supabase/server";
import {getAllRegions} from "@/server/services/region.service";

export async function getAllRegionsAction() {
    const supabase = await createServerSupabase();
    return getAllRegions(supabase)
}