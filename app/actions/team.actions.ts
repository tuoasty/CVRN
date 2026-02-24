"use server";

import {createTeam, deleteTeam, getAllTeams, getTeamByNameAndRegion} from "@/server/services/team.service";
import {createServerSupabase} from "@/server/supabase/server";
import {GetTeamByNameRegion, TeamIdInput} from "@/server/dto/team.dto";

export async function createTeamAction(name:string, file:File, regionId:string){
    const supabase = await createServerSupabase();
    return createTeam(supabase, {
        name,
        logoFile:file,
        regionId: regionId
    })
}

export async function getAllTeamsAction(){
    const supabase = await createServerSupabase();
    return getAllTeams(supabase)
}

export async function getTeamByNameAndRegionAction(input: GetTeamByNameRegion) {
    const supabase = await createServerSupabase();
    return getTeamByNameAndRegion(supabase, input)
}

export async function deleteTeamAction(input: TeamIdInput){
    const supabase = await createServerSupabase();
    return deleteTeam(supabase, input)
}