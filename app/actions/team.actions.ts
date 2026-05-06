"use server"

import {createServerSupabase} from "@/server/supabase/server";
import {z} from "zod"
import {Result, Err} from "@/shared/types/result";
import {
    TeamWithRegion,
    TeamWithRegionAndPlayers,
    GetTeamByNameSeasonSchema,
    TeamIdSchema,
    TeamSlugSeasonSchema,
    CreateTeamFormSchema,
    UpdateTeamFormSchema,
} from "@/server/domains/team";
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
import {Team} from "@/shared/types/db";

async function requireAuth(supabase: Awaited<ReturnType<typeof createServerSupabase>>) {
    const {data: {user}} = await supabase.auth.getUser();
    return user;
}

export async function createTeamAction(formData: FormData) {
    const parsed = CreateTeamFormSchema.safeParse({
        name: formData.get('name'),
        seasonId: formData.get('seasonId'),
        brickNumber: formData.get('brickNumber'),
        brickColor: formData.get('brickColor'),
        startingLvr: formData.get('startingLvr'),
    });
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});

    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});

    const file = formData.get('logo') as File;

    return createTeam(supabase, {
        name: parsed.data.name,
        logoFile: file,
        seasonId: parsed.data.seasonId,
        userId: user.id,
        brickNumber: parsed.data.brickNumber,
        brickColor: parsed.data.brickColor,
        startingLvr: parsed.data.startingLvr,
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

export async function getTeamByNameAndSeasonAction(input: unknown): Promise<Result<Team>> {
    const parsed = GetTeamByNameSeasonSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getTeamByNameAndSeason(supabase, parsed.data);
}

export async function deleteTeamAction(input: unknown): Promise<Result<void>> {
    const parsed = TeamIdSchema.safeParse(input);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return deleteTeam(supabase, parsed.data);
}

export async function getTeamWithPlayersAction(params: unknown): Promise<Result<TeamWithRegionAndPlayers>> {
    const parsed = TeamSlugSeasonSchema.safeParse(params);
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getTeamWithRegionAndPlayers(supabase, parsed.data);
}

export async function getTeamsByIdsAction(teamIds: unknown): Promise<Result<TeamWithRegion[]>> {
    const parsed = z.array(z.uuid()).safeParse(teamIds);
    if (!parsed.success) return Err({message: "Invalid team IDs", code: "VALIDATION_ERROR"});
    const supabase = await createServerSupabase();
    return getTeamsByIds(supabase, parsed.data);
}

export async function updateTeamAction(formData: FormData) {
    const parsed = UpdateTeamFormSchema.safeParse({
        teamId: formData.get('teamId'),
        name: formData.get('name'),
        brickNumber: formData.get('brickNumber'),
        brickColor: formData.get('brickColor'),
        startingLvr: formData.get('startingLvr'),
    });
    if (!parsed.success) return Err({message: parsed.error.issues.map(i => i.message).join(", "), code: "VALIDATION_ERROR"});

    const supabase = await createServerSupabase();
    const user = await requireAuth(supabase);
    if (!user) return Err({message: "User not authenticated", code: "UNAUTHORIZED"});

    const file = formData.get('logo') as File | null;

    return updateTeam(supabase, {
        teamId: parsed.data.teamId,
        name: parsed.data.name,
        logoFile: file && file.size > 0 ? file : null,
        userId: user.id,
        brickNumber: parsed.data.brickNumber,
        brickColor: parsed.data.brickColor,
        startingLvr: parsed.data.startingLvr,
    });
}
