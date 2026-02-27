"use server";

import {
    createTeam,
    deleteTeam,
    getAllTeams,
    getAllTeamsWithRegions,
    getTeamByNameAndRegion,
    getTeamBySlugAndRegionWithRegion,
    getTeamWithRegionAndPlayers
} from "@/server/services/team.service";
import {createServerSupabase} from "@/server/supabase/server";
import {GetTeamByNameRegion, TeamIdInput} from "@/server/dto/team.dto";
import {getRegionByCode} from "@/server/services/region.service";
import {Err} from "@/shared/types/result";

export async function createTeamAction(formData: FormData){
    const supabase = await createServerSupabase();

    const name = formData.get('name') as string;
    const file = formData.get('logo') as File;
    const regionId = formData.get('regionId') as string;
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
        regionId,
        userId: user.id
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

export async function getTeamByNameAndRegionAction(input: GetTeamByNameRegion) {
    const supabase = await createServerSupabase();
    return getTeamByNameAndRegion(supabase, input);
}

export async function deleteTeamAction(input: TeamIdInput){
    const supabase = await createServerSupabase();
    return deleteTeam(supabase, input);
}

export async function getTeamBySlugAndRegionAction(p: {
    slug: string;
    regionId: string;
}) {
    const supabase = await createServerSupabase();
    return getTeamBySlugAndRegionWithRegion(supabase, p);
}

export async function getTeamWithRegionAndPlayersAction(p: {
    slug: string;
    regionCode: string;
}) {
    const supabase = await createServerSupabase();

    const regionResult = await getRegionByCode(supabase, p.regionCode);

    if (!regionResult.ok) {
        return regionResult;
    }

    return getTeamWithRegionAndPlayers(supabase, {
        slug: p.slug,
        regionId: regionResult.value.id
    });
}