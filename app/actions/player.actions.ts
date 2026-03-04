"use server";

import {
    savePlayerToTeam,
    getUsersByName,
    getTeamPlayers,
    removePlayerFromTeamService,
    getPlayersByIds
} from "@/server/services/player.service";
import {createServerSupabase} from "@/server/supabase/server";
import {
    SavePlayerToTeamInput,
    RemovePlayerFromTeamInput,
    TeamPlayersInput,
    PlayersByIdsInput
} from "@/server/dto/player.dto";

export async function searchPlayersAction(username:string){
    const supabase = await createServerSupabase();
    return getUsersByName(supabase, username);
}

export async function savePlayerToTeamAction(input:SavePlayerToTeamInput){
    const supabase = await createServerSupabase();
    return savePlayerToTeam(supabase, input)
}

export async function removePlayerFromTeamAction(input:RemovePlayerFromTeamInput){
    const supabase = await createServerSupabase();
    return removePlayerFromTeamService(supabase, input)
}

export async function getTeamPlayersAction(input:TeamPlayersInput){
    const supabase = await createServerSupabase();
    return getTeamPlayers(supabase, input)
}

export async function getPlayersByIdsAction(input: PlayersByIdsInput) {
    const supabase = await createServerSupabase();
    return await getPlayersByIds(supabase, input);
}