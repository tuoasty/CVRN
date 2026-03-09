"use server";

import {
    createTeam,
    deleteTeam,
    getAllTeams,
    getAllTeamsWithRegions,
    getTeamByNameAndSeason,
    getTeamBySlugAndSeasonWithRegion, getTeamsByIds,
    getTeamWithRegionAndPlayers, updateTeam
} from "@/server/services/team.service";
import {createServerSupabase} from "@/server/supabase/server";
import {GetTeamByNameSeason, TeamIdInput} from "@/server/dto/team.dto";
import {Err} from "@/shared/types/result";

export async function createTeamAction(formData: FormData){
    const supabase = await createServerSupabase();

    const name = formData.get('name') as string;
    const file = formData.get('logo') as File;
    const seasonId = formData.get('seasonId') as string;
    const brickNumber = formData.get('brickNumber') as string;
    const brickColor = formData.get('brickColor') as string;
    const startingLvr = formData.get('startingLvr') as string;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return Err({
            message: "User not authenticated",
            name: "AuthError"
        });
    }

    return createTeam(supabase, {
        name,
        logoFile: file,
        seasonId,
        userId: user.id,
        brickNumber: parseInt(brickNumber, 10),
        brickColor: brickColor.toUpperCase(),
        startingLvr: parseFloat(startingLvr),
    });
}

export async function getAllTeamsAction(){
    const supabase = await createServerSupabase();
    return getAllTeams(supabase);
}

export async function getAllTeamsWithRegionsAction() {
    const supabase = await createServerSupabase();
    return getAllTeamsWithRegions(supabase);
}

export async function getTeamByNameAndSeasonAction(input: GetTeamByNameSeason) {
    const supabase = await createServerSupabase();
    return getTeamByNameAndSeason(supabase, input);
}

export async function deleteTeamAction(input: TeamIdInput){
    const supabase = await createServerSupabase();
    return deleteTeam(supabase, input);
}

export async function getTeamBySlugAndSeasonAction(p: {
    slug: string;
    seasonId: string;
}) {
    const supabase = await createServerSupabase();
    return getTeamBySlugAndSeasonWithRegion(supabase, p);
}

export async function getTeamWithPlayersAction(params: {
    slug: string;
    seasonId: string;
}): Promise<Result<TeamWithRegionAndPlayers>> {
    const supabase = await createServerSupabase();
    return getTeamWithRegionAndPlayers(supabase, params);
}

export async function getTeamsByIdsAction(teamIds: string[]) {
    const supabase = await createServerSupabase();
    return await getTeamsByIds(supabase, teamIds);
}

export async function updateTeamAction(formData: FormData) {
    const supabase = await createServerSupabase();

    const teamId = formData.get('teamId') as string;
    const name = formData.get('name') as string;
    const file = formData.get('logo') as File | null;
    const brickNumber = formData.get('brickNumber') as string;
    const brickColor = formData.get('brickColor') as string;
    const startingLvr = formData.get('startingLvr') as string;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return Err({ message: "User not authenticated", name: "AuthError" });
    }

    return updateTeam(supabase, {
        teamId,
        name,
        logoFile: file && file.size > 0 ? file : null,
        userId: user.id,
        brickNumber: parseInt(brickNumber, 10),
        brickColor: brickColor.toUpperCase(),
        startingLvr: parseFloat(startingLvr),
    });
}