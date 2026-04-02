"use server";

import {createServerSupabase} from "@/server/supabase/server";
import {getAllRegions} from "@/server/domains/region";

export async function getAllRegionsAction() {
    const supabase = await createServerSupabase();
    return getAllRegions(supabase)
}