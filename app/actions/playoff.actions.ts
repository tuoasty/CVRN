"use server"

import {z} from "zod"
import {createServerSupabase} from "@/server/supabase/server";
import {Err} from "@/shared/types/result";
import {
    GeneratePlayoffBracketSchema,
} from "@/server/domains/playoff";
import {
    generatePlayoffBracket,
    getPlayoffBracketBySeasonId,
    resetPlayoffBracketsService
} from "@/server/domains/playoff";

export async function generatePlayoffBracketAction(input: unknown) {
    const parsed = GeneratePlayoffBracketSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return generatePlayoffBracket(supabase, parsed.data);
}

export async function getPlayoffBracketBySeasonIdAction(seasonId: string) {
    const parsed = z.uuid().safeParse(seasonId);
    if (!parsed.success) return Err({message: "Invalid season ID", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getPlayoffBracketBySeasonId(supabase, parsed.data);
}

export async function resetPlayoffBracketsAction(seasonId: string) {
    const parsed = z.uuid().safeParse(seasonId);
    if (!parsed.success) return Err({message: "Invalid season ID", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return resetPlayoffBracketsService(supabase, parsed.data);
}
