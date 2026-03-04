"use server";

import {
    createTeam,
    deleteTeam,
    getAllTeams,
    getAllTeamsWithRegions,
    getTeamByNameAndSeason,
    getTeamBySlugAndSeasonWithRegion, getTeamsByIds,
    getTeamWithRegionAndPlayers
} from "@/server/services/team.service";
import {createServerSupabase} from "@/server/supabase/server";
import {GetTeamByNameSeason, TeamIdInput} from "@/server/dto/team.dto";
import {getRegionByCode} from "@/server/services/region.service";
import {getSeasonBySlugAndRegion} from "@/server/services/season.service";
import {Err} from "@/shared/types/result";

export async function createTeamAction(formData: FormData){
    const supabase = await createServerSupabase();

    const name = formData.get('name') as string;
    const file = formData.get('logo') as File;
    const seasonId = formData.get('seasonId') as string;
    const brickNumber = formData.get('brickNumber') as string;
    const brickColor = formData.get('brickColor') as string;
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
        brickColor: brickColor.toUpperCase()
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

export async function getTeamWithRegionAndPlayersAction(p: {
    slug: string;
    seasonSlug: string;
    regionCode: string;
}) {
    const supabase = await createServerSupabase();

    const regionResult = await getRegionByCode(supabase, p.regionCode);

    if (!regionResult.ok) {
        return regionResult;
    }

    const seasonResult = await getSeasonBySlugAndRegion(supabase, p.seasonSlug, regionResult.value.id);

    if (!seasonResult.ok) {
        return seasonResult;
    }

    return getTeamWithRegionAndPlayers(supabase, {
        slug: p.slug,
        seasonId: seasonResult.value.id
    });
}

export async function getTeamsByIdsAction(teamIds: string[]) {
    const supabase = await createServerSupabase();
    return await getTeamsByIds(supabase, teamIds);
}