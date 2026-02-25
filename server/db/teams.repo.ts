import {DBClient} from "@/shared/types/db";
import {GetTeamByNameRegion} from "@/server/dto/team.dto";

export async function findAllTeams(supabase: DBClient){
    return supabase.from("teams").select("*")
}

export async function findAllTeamsWithRegions(supabase: DBClient) {
    return supabase
        .from("teams")
        .select(`
            *,
            regions:region_id (
                code,
                name
            )
        `)
}

export async function findTeamById(supabase: DBClient, id:string){
    return supabase.from("teams").select("*").eq("id", id).single()
}

export async function findTeamByNameAndRegion(supabase: DBClient, p: GetTeamByNameRegion){
    return supabase.from("teams").select("*").ilike("name", p.name).eq("region_id", p.regionId).single()
}

export async function insertTeam(supabase: DBClient, p: {
    id?: string;
    name: string;
    slug: string;
    logoUrl: string;
    regionId: string;
}) {
    return supabase.from("teams").insert({
        ...(p.id && { id: p.id }),
        name: p.name,
        slug: p.slug,
        logo_url: p.logoUrl,
        region_id: p.regionId
    }).select().single()
}

export async function updateTeamById(supabase: DBClient, id:string, p: {
    name?:string, logoUrl?:string
}){
    return supabase.from("teams").update({
        ...(p.name && {name:p.name}),
            ...(p.logoUrl && {logo_url:p.logoUrl})
    }).eq("id", id).select().single()
}

export async function deleteTeamById(supabase: DBClient, id:string){
    return supabase.from("teams").delete().eq("id", id)
}

export async function findTeamBySlugAndRegion(supabase: DBClient, p: {
    slug: string;
    regionId: string;
}) {
    return supabase.from("teams").select("*").eq("slug", p.slug).eq("region_id", p.regionId).single()
}

export async function findTeamBySlugAndRegionWithRegion(supabase: DBClient, p: {
    slug: string;
    regionId: string;
}) {
    return supabase
        .from("teams")
        .select(`
            *,
            regions:region_id (
                code,
                name
            )
        `)
        .eq("slug", p.slug)
        .eq("region_id", p.regionId)
        .single()
}

export async function findTeamByIdWithRegion(supabase: DBClient, teamId: string) {
    return supabase
        .from('teams')
        .select(`
            *,
            regions (
                code,
                name
            )
        `)
        .eq('id', teamId)
        .single();
}