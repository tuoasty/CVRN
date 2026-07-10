"use server"

import {z} from "zod"
import {createServerSupabase} from "@/server/supabase/server";
import {Err} from "@/shared/types/result";
import {requireSuperAdmin} from "@/server/domains/auth";
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
    getDefaultWeekForSeason,
    getPlayoffRoundCounts,
    getWeekMatchCounts,
    getMatchDetail,
    getMatchDetailById,
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
    const guard = await requireSuperAdmin(supabase);
    if (!guard.ok) return guard;
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
    const seasonParsed = z.uuid().safeParse(seasonId);
    if (!seasonParsed.success) return Err({message: "Invalid season ID", code: "VALIDATION_ERROR"});
    const limitParsed = z.number().int().min(1).max(100).safeParse(limit);
    if (!limitParsed.success) return Err({message: "Invalid limit", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getUpcomingMatches(supabase, seasonParsed.data, limitParsed.data);
}

export async function getMatchDetailAction(
    regionCode: string,
    seasonSlug: string,
    matchCode: string
) {
    const supabase = await createServerSupabase();
    return getMatchDetail(supabase, {regionCode, seasonSlug, matchCode});
}

export async function getMatchDetailByIdAction(matchId: string) {
    const parsed = z.uuid().safeParse(matchId);
    if (!parsed.success) return Err({message: "Invalid match ID", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getMatchDetailById(supabase, parsed.data);
}

export async function getDefaultWeekForSeasonAction(seasonId: string) {
    const parsed = z.uuid().safeParse(seasonId);
    if (!parsed.success) return Err({message: "Invalid season ID", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getDefaultWeekForSeason(supabase, parsed.data);
}

export async function getPlayoffRoundCountsAction(seasonId: string) {
    const parsed = z.uuid().safeParse(seasonId);
    if (!parsed.success) return Err({message: "Invalid season ID", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getPlayoffRoundCounts(supabase, parsed.data);
}

export async function getWeekMatchCountsAction(seasonId: string) {
    const parsed = z.uuid().safeParse(seasonId);
    if (!parsed.success) return Err({message: "Invalid season ID", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getWeekMatchCounts(supabase, parsed.data);
}

export async function getRecentMatchesAction(seasonId: string, limit: number = 5) {
    const seasonParsed = z.uuid().safeParse(seasonId);
    if (!seasonParsed.success) return Err({message: "Invalid season ID", code: "VALIDATION_ERROR"});
    const limitParsed = z.number().int().min(1).max(100).safeParse(limit);
    if (!limitParsed.success) return Err({message: "Invalid limit", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getRecentMatches(supabase, seasonParsed.data, limitParsed.data);
}
