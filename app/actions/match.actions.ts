"use server"

import {getAllMatches} from "@/server/services/match.service";
import {createServerSupabase} from "@/server/supabase/server";

export async function getAllMatchesAction(){
    const supabase = await createServerSupabase()
    return getAllMatches(supabase);
}