"use server";

import { createServerSupabase } from "@/server/supabase/server";
import { getStandings } from "@/server/domains/standing";
import { GetStandingsInput } from "@/server/dto/standing.dto";

export async function getStandingsAction(input: GetStandingsInput) {
    const supabase = await createServerSupabase();
    return getStandings(supabase, input);
}