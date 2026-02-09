"use server"

import {savePlayer, getUsersByName} from "@/server/services/player.service";
import {createServerSupabase} from "@/server/supabase/server";
import {SavePlayerInput} from "@/server/dto/player.dto";

export async function searchPlayersAction(username:string){
    const supabase = await createServerSupabase()
    return getUsersByName(supabase, username);
}

export async function savePlayerToTeamAction(input:SavePlayerInput){
    const supabase = await createServerSupabase();
    return savePlayer(supabase, input)
}