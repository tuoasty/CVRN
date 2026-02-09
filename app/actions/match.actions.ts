"use server"

import {getMatches} from "@/server/services/match.service";
import {createServerSupabase} from "@/server/supabase/server";

export async function getMatchesAction(){
    const supabase = await createServerSupabase()
    return getMatches(supabase);
}