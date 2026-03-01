"use server"

import {CreateMatchesInput} from "@/server/dto/match.dto";
import {createServerSupabase} from "@/server/supabase/server";
import {createMatches, getAllMatches, getAvailableTeamsForWeek} from "@/server/services/match.service";

export async function createMatchesAction(input:CreateMatchesInput) {
    const supabase = await createServerSupabase()
    return await createMatches(supabase, input);
}

export async function getAvailableTeamsForWeekAction(input: {seasonId: string, week:number}) {
    const supabase = await createServerSupabase()
    return await getAvailableTeamsForWeek(supabase, input);
}

export async function getAllMatchesAction() {
    const supabase = await createServerSupabase()
    return await getAllMatches(supabase);
}