"use server";

import {savePlayer, getUsersByName, getTeamPlayers, removePlayerFromTeam} from "@/server/services/player.service";
import {createServerSupabase} from "@/server/supabase/server";
import {RobloxUserIdInput, SavePlayerInput} from "@/server/dto/player.dto";
import {TeamIdInput} from "@/server/dto/team.dto";

export async function searchPlayersAction(username:string){
    const supabase = await createServerSupabase();
    return getUsersByName(supabase, username);
}

export async function savePlayerToTeamAction(input:SavePlayerInput){
    const supabase = await createServerSupabase();
    return savePlayer(supabase, input)
}

export async function removePlayerFromTeamAction(input:RobloxUserIdInput){
    const supabase = await createServerSupabase();
    return removePlayerFromTeam(supabase, input)
}

export async function getTeamPlayersAction(input:TeamIdInput){
    const supabase = await createServerSupabase();
    return getTeamPlayers(supabase, input)
}