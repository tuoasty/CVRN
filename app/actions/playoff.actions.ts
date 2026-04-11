"use server"

import { createServerSupabase } from "@/server/supabase/server";
import type { GeneratePlayoffBracketInput } from "@/server/domains/playoff";
import {
    generatePlayoffBracket,
    getPlayoffBracketBySeasonId,
    resetPlayoffBracketsService
} from "@/server/domains/playoff";

export async function generatePlayoffBracketAction(input: GeneratePlayoffBracketInput) {
    const supabase = await createServerSupabase();
    return generatePlayoffBracket(supabase, input);
}

export async function getPlayoffBracketBySeasonIdAction(seasonId: string) {
    const supabase = await createServerSupabase();
    return getPlayoffBracketBySeasonId(supabase, seasonId);
}

export async function resetPlayoffBracketsAction(seasonId: string) {
    const supabase = await createServerSupabase();
    return resetPlayoffBracketsService(supabase, seasonId);
}