"use server"

import {z} from "zod"
import {createServerSupabase} from "@/server/supabase/server";
import {Err} from "@/shared/types/result";
import {requireSuperAdmin} from "@/server/domains/auth";
import {
    buildPlayoffBracket,
    GeneratePlayoffBracketSchema,
} from "@/server/domains/playoff";
import {
    getPlayoffBracketBySeasonId,
    getAllPlayoffConfigs,
    resetPlayoffBracketsService
} from "@/server/domains/playoff";

export async function generatePlayoffBracketAction(input: unknown) {
    const parsed = GeneratePlayoffBracketSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return buildPlayoffBracket(supabase, parsed.data);
}

export async function getPlayoffBracketBySeasonIdAction(seasonId: string) {
    const parsed = z.uuid().safeParse(seasonId);
    if (!parsed.success) return Err({message: "Invalid season ID", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getPlayoffBracketBySeasonId(supabase, parsed.data);
}

export async function getAllPlayoffConfigsAction() {
    const supabase = await createServerSupabase();
    return getAllPlayoffConfigs(supabase);
}

export async function resetPlayoffBracketsAction(seasonId: string) {
    const parsed = z.uuid().safeParse(seasonId);
    if (!parsed.success) return Err({message: "Invalid season ID", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    const guard = await requireSuperAdmin(supabase);
    if (!guard.ok) return guard;
    return resetPlayoffBracketsService(supabase, parsed.data);
}
