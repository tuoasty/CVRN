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
        brick_color: p.brickColor,
        starting_lvr: p.startingLvr,
    }).select().single()
}

export async function updateTeamById(supabase: DBClient, id: string, p: {
    name?: string;
    slug?: string;
    logoUrl?: string;
    brickNumber?: number;
    brickColor?: string;
    startingLvr?: number;
}) {
    return supabase
        .from("teams")
        .update({
            ...(p.name !== undefined && { name: p.name }),
            ...(p.slug !== undefined && { slug: p.slug }),
            ...(p.logoUrl !== undefined && { logo_url: p.logoUrl }),
            ...(p.brickNumber !== undefined && { brick_number: p.brickNumber }),
            ...(p.brickColor !== undefined && { brick_color: p.brickColor }),
            ...(p.startingLvr !== undefined && { starting_lvr: p.startingLvr }),
        })
        .eq("id", id)
        .is("deleted_at", null)
        .select()
        .single();
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

export async function findTeamsByIds(supabase: DBClient, teamIds: string[]) {
    return supabase
        .from("teams")
        .select(`
            *,
            seasons!inner(
                id,
                name,
                slug,
                regions!inner(
                    id,
                    code,
                    name
                )
            )
        `)
        .in("id", teamIds)
        .is("deleted_at", null);
}