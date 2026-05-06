"use server"

import {z} from "zod"
import {createServerSupabase} from "@/server/supabase/server";
import {Err} from "@/shared/types/result";
import {
    assignOfficialToMatch,
    assignMultipleOfficialsToMatch,
    getMatchOfficials,
    getMatchOfficialsByType,
    removeOfficialFromMatch,
    removeAllOfficialsOfType
} from "@/server/domains/matchOfficial";
import {
    AssignOfficialSchema,
    AssignMultipleOfficialsSchema,
    OfficialTypeSchema,
} from "@/server/domains/matchOfficial";
import {
    getAllOfficials,
    getOfficialsByName,
    saveOfficial,
    removeOfficial,
    searchOfficialsInDatabase,
    getOfficialByExactUsername
} from "@/server/domains/official";
import {
    SaveOfficialSchema,
    SearchOfficialsSchema,
} from "@/server/domains/official";

export async function searchOfficialsByNameAction(username: string) {
    const parsed = z.string().min(1).safeParse(username);
    if (!parsed.success) return Err({message: "Search query must not be empty", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getOfficialsByName(supabase, parsed.data);
}

export async function saveOfficialAction(input: unknown) {
    const parsed = SaveOfficialSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return saveOfficial(supabase, parsed.data);
}

export async function getAllOfficialsAction() {
    const supabase = await createServerSupabase();
    return getAllOfficials(supabase);
}

export async function removeOfficialAction(input: unknown) {
    const parsed = z.object({robloxUserId: z.string().min(1)}).safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return removeOfficial(supabase, parsed.data);
}

export async function assignOfficialToMatchAction(input: unknown) {
    const parsed = AssignOfficialSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return assignOfficialToMatch(supabase, parsed.data);
}

export async function assignMultipleOfficialsToMatchAction(input: unknown) {
    const parsed = AssignMultipleOfficialsSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return assignMultipleOfficialsToMatch(supabase, parsed.data);
}

export async function getMatchOfficialsAction(matchId: string) {
    const parsed = z.uuid().safeParse(matchId);
    if (!parsed.success) return Err({message: "Invalid match ID", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getMatchOfficials(supabase, {matchId: parsed.data});
}

export async function getMatchOfficialsByTypeAction(matchId: string, officialType: unknown) {
    const matchParsed = z.uuid().safeParse(matchId);
    if (!matchParsed.success) return Err({message: "Invalid match ID", code: "VALIDATION_ERROR"});
    const typeParsed = OfficialTypeSchema.safeParse(officialType);
    if (!typeParsed.success) return Err({message: "Invalid official type", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getMatchOfficialsByType(supabase, matchParsed.data, typeParsed.data);
}

export async function removeOfficialFromMatchAction(matchId: string, officialId: string, officialType: unknown) {
    const matchParsed = z.uuid().safeParse(matchId);
    if (!matchParsed.success) return Err({message: "Invalid match ID", code: "VALIDATION_ERROR"});
    const officialParsed = z.uuid().safeParse(officialId);
    if (!officialParsed.success) return Err({message: "Invalid official ID", code: "VALIDATION_ERROR"});
    const typeParsed = OfficialTypeSchema.safeParse(officialType);
    if (!typeParsed.success) return Err({message: "Invalid official type", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return removeOfficialFromMatch(supabase, matchParsed.data, officialParsed.data, typeParsed.data);
}

export async function removeAllOfficialsOfTypeAction(matchId: string, officialType: unknown) {
    const matchParsed = z.uuid().safeParse(matchId);
    if (!matchParsed.success) return Err({message: "Invalid match ID", code: "VALIDATION_ERROR"});
    const typeParsed = OfficialTypeSchema.safeParse(officialType);
    if (!typeParsed.success) return Err({message: "Invalid official type", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return removeAllOfficialsOfType(supabase, matchParsed.data, typeParsed.data);
}

export async function searchOfficialsInDatabaseAction(input: unknown) {
    const parsed = SearchOfficialsSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return searchOfficialsInDatabase(supabase, parsed.data);
}

export async function getOfficialByExactUsernameAction(input: unknown) {
    const parsed = SearchOfficialsSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getOfficialByExactUsername(supabase, parsed.data);
}
