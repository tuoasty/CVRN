"use server"

import { createServerSupabase } from "@/server/supabase/server";
import { GeneratePlayoffBracketInput } from "@/server/dto/playoff.dto";
import {
    generatePlayoffBracket,
    getPlayoffBracketBySeasonId,
    resetPlayoffBracketsService
} from "@/server/services/playoff.service";

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