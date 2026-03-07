"use server"

import {
    CompleteMatchInput,
    CreateMatchesInput,
    MatchSetsInput,
    UpdateMatchScheduleInput,
    VoidMatchInput
} from "@/server/dto/match.dto";
import {createServerSupabase} from "@/server/supabase/server";
import {
    completeMatchService,
    createMatches, deleteMatchService,
    getAllMatches, getAvailablePlayoffRounds,
    getAvailableTeamsForWeek,
    getMatchesForWeek,
    getMatchSets, getPlayoffSchedule,
    getWeekSchedule,
    updateMatchResultsService,
    updateMatchScheduleService,
    voidMatchService
} from "@/server/services/match.service";
import {GetPlayoffScheduleInput} from "@/server/dto/playoff.dto";

export async function createMatchesAction(input:CreateMatchesInput) {
    const supabase = await createServerSupabase()
    return await createMatches(supabase, input);
}

export async function getAvailableTeamsForWeekAction(input: {seasonId: string, week:number}) {
    const supabase = await createServerSupabase()
    return await getAvailableTeamsForWeek(supabase, input);
}

export async function getAllMatchesAction() {
    const supabase = await createServerSupabase()
    return await getAllMatches(supabase);
}

export async function getMatchesForWeekAction(input: {seasonId: string, week: number}) {
    const supabase = await createServerSupabase()
    return await getMatchesForWeek(supabase, input);
}

export async function updateMatchScheduleAction(input: UpdateMatchScheduleInput) {
    const supabase = await createServerSupabase();
    return await updateMatchScheduleService(supabase, input);
}

export async function completeMatchAction(input: CompleteMatchInput) {
    const supabase = await createServerSupabase();
    return await completeMatchService(supabase, input);
}

export async function voidMatchAction(input: VoidMatchInput) {
    const supabase = await createServerSupabase();
    return await voidMatchService(supabase, input);
}

export async function getMatchSetsAction(input: MatchSetsInput) {
    const supabase = await createServerSupabase();
    return await getMatchSets(supabase, input);
}

export async function updateMatchResultsAction(input: CompleteMatchInput) {
    const supabase = await createServerSupabase();
    return await updateMatchResultsService(supabase, input);
}

export async function getWeekScheduleAction(input: { seasonId: string; week: number }) {
    const supabase = await createServerSupabase();
    return await getWeekSchedule(supabase, input);
}

export async function getPlayoffScheduleAction(input: GetPlayoffScheduleInput) {
    const supabase = await createServerSupabase();
    return await getPlayoffSchedule(supabase, input);
}

export async function getAvailablePlayoffRoundsAction(seasonId: string) {
    const supabase = await createServerSupabase();
    return await getAvailablePlayoffRounds(supabase, seasonId);
}

export async function deleteMatchAction(matchId: string) {
    const supabase = await createServerSupabase();
    return await deleteMatchService(supabase, matchId);
}