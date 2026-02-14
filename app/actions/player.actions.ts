"use server"

import {savePlayer, getUsersByName, getTeamPlayers} from "@/server/services/player.service";
import {createServerSupabase} from "@/server/supabase/server";
import {GetTeamPlayers, SavePlayerInput} from "@/server/dto/player.dto";

export async function searchPlayersAction(username:string){
    const supabase = await createServerSupabase()
    return getUsersByName(supabase, username);
}

export async function savePlayerToTeamAction(input:SavePlayerInput){
    const supabase = await createServerSupabase();
    return savePlayer(supabase, input)
}

export async function getTeamPlayersAction(input:GetTeamPlayers){
    const supabase = await createServerSupabase()
    return getTeamPlayers(supabase, input)
}