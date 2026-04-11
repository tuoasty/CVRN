"use server"

import {
    CompleteMatchInput,
    CreateMatchesInput,
    UpdateMatchScheduleInput,
    VoidMatchInput
} from "@/server/dto/match.dto";
import {createServerSupabase} from "@/server/supabase/server";
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
import {GetPlayoffScheduleInput} from "@/server/dto/playoff.dto";

export async function createMatchesAction(input:CreateMatchesInput) {
    const supabase = await createServerSupabase()
    return createMatches(supabase, input);
}

export async function getAvailableTeamsForWeekAction(input: {seasonId: string, week:number}) {
    const supabase = await createServerSupabase()
    return getAvailableTeamsForWeek(supabase, input);
}

export async function getAllMatchesAction() {
    const supabase = await createServerSupabase()
    return getAllMatches(supabase);
}

export async function getMatchesForWeekAction(input: {seasonId: string, week: number}) {
    const supabase = await createServerSupabase()
    return getMatchesForWeek(supabase, input);
}

export async function updateMatchScheduleAction(input: UpdateMatchScheduleInput) {
    const supabase = await createServerSupabase();
    return updateMatchScheduleService(supabase, input);
}

export async function completeMatchAction(input: CompleteMatchInput) {
    const supabase = await createServerSupabase();
    return completeMatchService(supabase, input);
}

export async function voidMatchAction(input: VoidMatchInput) {
    const supabase = await createServerSupabase();
    return voidMatchService(supabase, input);
}

export async function updateMatchResultsAction(input: CompleteMatchInput) {
    const supabase = await createServerSupabase();
    return updateMatchResultsService(supabase, input);
}

export async function getWeekScheduleAction(input: { seasonId: string; week: number }) {
    const supabase = await createServerSupabase();
    return getWeekSchedule(supabase, input);
}

export async function getPlayoffScheduleAction(input: GetPlayoffScheduleInput) {
    const supabase = await createServerSupabase();
    return getPlayoffSchedule(supabase, input);
}

export async function getAvailablePlayoffRoundsAction(seasonId: string) {
    const supabase = await createServerSupabase();
    return getAvailablePlayoffRounds(supabase, seasonId);
}

export async function deleteMatchAction(matchId: string) {
    const supabase = await createServerSupabase();
    return deleteMatchService(supabase, matchId);
}

export async function getUpcomingMatchesAction(seasonId: string, limit: number = 5) {
    const supabase = await createServerSupabase();
    return getUpcomingMatches(supabase, seasonId, limit);
}

export async function getRecentMatchesAction(seasonId: string, limit: number = 5) {
    const supabase = await createServerSupabase();
    return getRecentMatches(supabase, seasonId, limit);
}