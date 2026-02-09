"use server"

import {getUsersByName} from "@/server/services/player.service";
import {createServerSupabase} from "@/server/supabase/server";

export async function searchPlayersAction(username:string){
    const supabase = await createServerSupabase()
    return getUsersByName(supabase, username);
}