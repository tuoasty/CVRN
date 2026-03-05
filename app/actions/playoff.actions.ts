"use server"

import { createServerSupabase } from "@/server/supabase/server";
import { GeneratePlayoffBracketInput } from "@/server/dto/playoff.dto";
import {generatePlayoffBracket, getPlayoffBracketBySeasonId} from "@/server/services/playoff.service";

export async function generatePlayoffBracketAction(input: GeneratePlayoffBracketInput) {
    const supabase = await createServerSupabase();
    return await generatePlayoffBracket(supabase, input);
}

export async function getPlayoffBracketBySeasonIdAction(seasonId: string) {
    const supabase = await createServerSupabase();
    return await getPlayoffBracketBySeasonId(supabase, seasonId);
}