"use server"

import {createServerSupabase} from "@/server/supabase/server";
import {
    assignOfficialToMatch,
    assignMultipleOfficialsToMatch,
    getMatchOfficials,
    getMatchOfficialsByType,
    removeOfficialFromMatch,
    removeAllOfficialsOfType
} from "@/server/domains/matchOfficial";
import {
    getAllOfficials,
    getOfficialsByName,
    saveOfficial,
    removeOfficial,
    searchOfficialsInDatabase,
    getOfficialByExactUsername
} from "@/server/domains/official";
import {AssignOfficialInput, AssignMultipleOfficialsInput, OfficialType} from "@/server/dto/matchOfficial.dto";
import {SaveOfficialInput, SearchOfficialsInput} from "@/server/dto/official.dto";
import {RobloxUserIdInput} from "@/server/dto/player.dto";

export async function searchOfficialsByNameAction(username: string) {
    const supabase = await createServerSupabase();
    return getOfficialsByName(supabase, username);
}

export async function saveOfficialAction(input: SaveOfficialInput) {
    const supabase = await createServerSupabase();
    return saveOfficial(supabase, input);
}

export async function getAllOfficialsAction() {
    const supabase = await createServerSupabase();
    return getAllOfficials(supabase);
}

export async function removeOfficialAction(input: RobloxUserIdInput) {
    const supabase = await createServerSupabase();
    return removeOfficial(supabase, input);
}

export async function assignOfficialToMatchAction(input: AssignOfficialInput) {
    const supabase = await createServerSupabase();
    return assignOfficialToMatch(supabase, input);
}

export async function assignMultipleOfficialsToMatchAction(input: AssignMultipleOfficialsInput) {
    const supabase = await createServerSupabase();
    return assignMultipleOfficialsToMatch(supabase, input);
}

export async function getMatchOfficialsAction(matchId: string) {
    const supabase = await createServerSupabase();
    return getMatchOfficials(supabase, { matchId });
}

export async function getMatchOfficialsByTypeAction(matchId: string, officialType: OfficialType) {
    const supabase = await createServerSupabase();
    return getMatchOfficialsByType(supabase, matchId, officialType);
}

export async function removeOfficialFromMatchAction(
    matchId: string,
    officialId: string,
    officialType: OfficialType
) {
    const supabase = await createServerSupabase();
    return removeOfficialFromMatch(supabase, matchId, officialId, officialType);
}

export async function removeAllOfficialsOfTypeAction(matchId: string, officialType: OfficialType) {
    const supabase = await createServerSupabase();
    return removeAllOfficialsOfType(supabase, matchId, officialType);
}

export async function searchOfficialsInDatabaseAction(input: SearchOfficialsInput) {
    const supabase = await createServerSupabase();
    return searchOfficialsInDatabase(supabase, input);
}

export async function getOfficialByExactUsernameAction(input:SearchOfficialsInput) {
    const supabase = await createServerSupabase();
    return getOfficialByExactUsername(supabase, input);
}