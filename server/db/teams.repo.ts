import {DBClient} from "@/shared/types/db";
import {GetTeamByNameRegion} from "@/server/dto/team.dto";

export async function findAllTeams(supabase: DBClient){
    return supabase.from("teams").select("*")
}

export async function findTeamById(supabase: DBClient, id:string){
    return supabase.from("teams").select("*").eq("id", id).single()
}

export async function findTeamByNameAndRegion(supabase: DBClient, p: GetTeamByNameRegion){
    return supabase.from("teams").select("*").ilike("name", p.name).ilike("region", p.region).single()
}

export async function insertTeam(supabase: DBClient, p: {
    id?: string;
    name: string;
    logoUrl: string;
    region: string;
}) {
    return supabase.from("teams").insert({
        ...(p.id && { id: p.id }),
        name: p.name,
        logo_url: p.logoUrl,
        region: p.region
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