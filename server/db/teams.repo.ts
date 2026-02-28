import {DBClient} from "@/shared/types/db";
import {InsertTeamDto} from "@/server/dto/team.dto";

export async function findAllTeams(supabase: DBClient){
    return supabase.from("teams").select("*")
}

export async function findAllTeamsWithRegions(supabase: DBClient) {
    return supabase
        .from("teams")
        .select(`
            *,
            seasons!inner (
                id,
                name,
                slug,
                regions!inner (
                    id,
                    code,
                    name
                )
            )
        `)
        .is("deleted_at", null)
}
export async function findTeamById(supabase: DBClient, id:string){
    return supabase.from("teams").select("*").eq("id", id).single()
}

export async function findTeamByNameAndSeason(supabase: DBClient, p: {
    name: string;
    seasonId: string;
}) {
    return supabase
        .from("teams")
        .select("*")
        .ilike("name", p.name)
        .eq("season_id", p.seasonId)
        .is("deleted_at", null)
        .single()
}

export async function insertTeam(supabase: DBClient, p: InsertTeamDto) {
    return supabase.from("teams").insert({
        ...(p.id && { id: p.id }),
        name: p.name,
        slug: p.slug,
        logo_url: p.logoUrl,
        season_id: p.seasonId,
        brick_number: p.brickNumber,
        brick_color: p.brickColor
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

export async function findTeamBySlugAndSeason(supabase: DBClient, p: {
    slug: string;
    seasonId: string;
}) {
    return supabase
        .from("teams")
        .select("*")
        .eq("slug", p.slug)
        .eq("season_id", p.seasonId)
        .is("deleted_at", null)
        .single()
}

export async function findTeamBySlugAndSeasonWithRegion(supabase: DBClient, p: {
    slug: string;
    seasonId: string;
}) {
    return supabase
        .from("teams")
        .select(`
            *,
            seasons!inner (
                id,
                name,
                slug,
                regions!inner (
                    id,
                    code,
                    name
                )
            )
        `)
        .eq("slug", p.slug)
        .eq("season_id", p.seasonId)
        .is("deleted_at", null)
        .single()
}

export async function findTeamByIdWithRegion(supabase: DBClient, teamId: string) {
    return supabase
        .from('teams')
        .select(`
            *,
            seasons!inner (
                id,
                name,
                slug,
                regions!inner (
                    id,
                    code,
                    name
                )
            )
        `)
        .eq('id', teamId)
        .is("deleted_at", null)
        .single();
}

export async function softDeleteTeamById(supabase: DBClient, id: string) {
    return supabase
        .from("teams")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .is("deleted_at", null)
}