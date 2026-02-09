"use server"

import {createTeam, getAllTeams} from "@/server/services/team.service";
import {createServerSupabase} from "@/server/supabase/server";

export async function createTeamAction(name:string, file:File){
    const supabase = await createServerSupabase()
    return createTeam(supabase, {
        name,
        logoFile:file
    })
}

export async function getAllTeamsAction(){
    const supabase = await createServerSupabase()
    return getAllTeams(supabase)
}