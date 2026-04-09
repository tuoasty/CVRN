"use server";

import { createServerSupabase } from "@/server/supabase/server";
import { Result, Err } from "@/shared/types/result";
import {
    GetTeamByNameSeason,
    TeamIdInput,
    TeamWithRegion,
    TeamWithRegionAndPlayers,
} from "@/server/dto/team.dto";
import {
    createTeam,
    deleteTeam,
    getAllTeams,
    getAllTeamsWithRegions,
    getTeamByNameAndSeason,
    getTeamsByIds,
    getTeamWithRegionAndPlayers,
    updateTeam
} from "@/server/domains/team";
import { Team } from "@/shared/types/db";

async function requireAuth(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function createTeamAction(formData: FormData) {
    const supabase = await createServerSupabase();

    const name = formData.get('name') as string;
    const file = formData.get('logo') as File;
    const seasonId = formData.get('seasonId') as string;
    const brickNumber = formData.get('brickNumber') as string;
    const brickColor = formData.get('brickColor') as string;
    const startingLvr = formData.get('startingLvr') as string;
    const user = await requireAuth(supabase);
    if (!user) return Err({ message: "User not authenticated", name: "AuthError" });

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

export async function getAllTeamsAction() {
    const supabase = await createServerSupabase();
    return getAllTeams(supabase);
}

export async function getAllTeamsWithRegionsAction(): Promise<Result<TeamWithRegion[]>> {
    const supabase = await createServerSupabase();
    return getAllTeamsWithRegions(supabase);
}

export async function getTeamByNameAndSeasonAction(input: GetTeamByNameSeason): Promise<Result<Team>> {
    const supabase = await createServerSupabase();
    return getTeamByNameAndSeason(supabase, input);
}

export async function deleteTeamAction(input: TeamIdInput): Promise<Result<void>> {
    const supabase = await createServerSupabase();
    return deleteTeam(supabase, input);
}

export async function getTeamWithPlayersAction(params: {
    slug: string;
    seasonId: string;
}): Promise<Result<TeamWithRegionAndPlayers>> {
    const supabase = await createServerSupabase();
    return getTeamWithRegionAndPlayers(supabase, params);
}

export async function getTeamsByIdsAction(teamIds: string[]): Promise<Result<TeamWithRegion[]>> {
    const supabase = await createServerSupabase();
    return getTeamsByIds(supabase, teamIds);
}

export async function updateTeamAction(formData: FormData) {
    const supabase = await createServerSupabase();

    const teamId = formData.get('teamId') as string;
    const name = formData.get('name') as string;
    const file = formData.get('logo') as File | null;
    const brickNumber = formData.get('brickNumber') as string;
    const brickColor = formData.get('brickColor') as string;
    const startingLvr = formData.get('startingLvr') as string;

    const user = await requireAuth(supabase);
    if (!user) return Err({ message: "User not authenticated", name: "AuthError" });

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