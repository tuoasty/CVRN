"use server"

import {z} from "zod"
import {createServerSupabase} from "@/server/supabase/server";
import {Err} from "@/shared/types/result";
import {
    CreateMatchesSchema,
    UpdateMatchScheduleSchema,
    CompleteMatchSchema,
    VoidMatchSchema,
    SeasonWeekSchema,
} from "@/server/domains/match";
import {GetPlayoffScheduleSchema} from "@/server/domains/playoff";
import {
    completeMatchService,
    createMatches,
    deleteMatchService,
    getAllMatches,
    getAvailablePlayoffRounds,
    getAvailableTeamsForWeek,
    getMatchesForWeek,
    getPlayoffSchedule,
    getRecentMatches,
    getUpcomingMatches,
    getWeekSchedule,
    updateMatchResultsService,
    updateMatchScheduleService,
    voidMatchService
} from "@/server/domains/match";

export async function createMatchesAction(input: unknown) {
    const parsed = CreateMatchesSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return createMatches(supabase, parsed.data);
}

export async function getAvailableTeamsForWeekAction(input: unknown) {
    const parsed = SeasonWeekSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getAvailableTeamsForWeek(supabase, parsed.data);
}

export async function getAllMatchesAction() {
    const supabase = await createServerSupabase();
    return getAllMatches(supabase);
}

export async function getMatchesForWeekAction(input: unknown) {
    const parsed = SeasonWeekSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getMatchesForWeek(supabase, parsed.data);
}

export async function updateMatchScheduleAction(input: unknown) {
    const parsed = UpdateMatchScheduleSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return updateMatchScheduleService(supabase, parsed.data);
}

export async function completeMatchAction(input: unknown) {
    const parsed = CompleteMatchSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return completeMatchService(supabase, parsed.data);
}

export async function voidMatchAction(input: unknown) {
    const parsed = VoidMatchSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return voidMatchService(supabase, parsed.data);
}

export async function updateMatchResultsAction(input: unknown) {
    const parsed = CompleteMatchSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return updateMatchResultsService(supabase, parsed.data);
}

export async function getWeekScheduleAction(input: unknown) {
    const parsed = SeasonWeekSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getWeekSchedule(supabase, parsed.data);
}

export async function getPlayoffScheduleAction(input: unknown) {
    const parsed = GetPlayoffScheduleSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getPlayoffSchedule(supabase, parsed.data);
}

export async function getAvailablePlayoffRoundsAction(seasonId: string) {
    const parsed = z.uuid().safeParse(seasonId);
    if (!parsed.success) return Err({message: "Invalid season ID", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getAvailablePlayoffRounds(supabase, parsed.data);
}

export async function deleteMatchAction(matchId: string) {
    const parsed = z.uuid().safeParse(matchId);
    if (!parsed.success) return Err({message: "Invalid match ID", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return deleteMatchService(supabase, parsed.data);
}

export async function getUpcomingMatchesAction(seasonId: string, limit: number = 5) {
    const parsed = z.uuid().safeParse(seasonId);
    if (!parsed.success) return Err({message: "Invalid season ID", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getUpcomingMatches(supabase, parsed.data, limit);
}

export async function getRecentMatchesAction(seasonId: string, limit: number = 5) {
    const parsed = z.uuid().safeParse(seasonId);
    if (!parsed.success) return Err({message: "Invalid season ID", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getRecentMatches(supabase, parsed.data, limit);
}
