"use server"

import {createServerSupabase} from "@/server/supabase/server";
import {Err} from "@/shared/types/result";
import {getStandings} from "@/server/domains/standing";
import {GetStandingsSchema} from "@/server/domains/standing";

export async function getStandingsAction(input: unknown) {
    const parsed = GetStandingsSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getStandings(supabase, parsed.data);
}
