"use server"

import {createTeam, getAllTeams, getTeamByNameAndRegion} from "@/server/services/team.service";
import {createServerSupabase} from "@/server/supabase/server";
import {GetTeamByNameRegion} from "@/server/dto/team.dto";

export async function createTeamAction(name:string, file:File, region:string){
    const supabase = await createServerSupabase()
    return createTeam(supabase, {
        name,
        logoFile:file,
        region: region
    })
}

export async function getAllTeamsAction(){
    const supabase = await createServerSupabase()
    return getAllTeams(supabase)
}

export async function getTeamByNameAndRegionAction(input: GetTeamByNameRegion) {
    const supabase = await createServerSupabase()
    return getTeamByNameAndRegion(supabase, input)
}