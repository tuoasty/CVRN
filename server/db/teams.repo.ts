import {createClient} from "@/server/supabase/server";

export async function findAllTeams(){
    const supabase = await createClient();
    return supabase.from("teams").select("*")
}

export async function findTeamById(id:string){
    const supabase = await createClient()
    return supabase.from("teams").select("*").eq("id", id).single()
}

export async function insertTeam(data: {
    id?: string;
    name?: string;
    logoUrl?: string;
}) {
    const supabase = await createClient();
    return supabase.from("teams").insert({
        ...(data.id && { id: data.id }),
        name: data.name,
        logo_url: data.logoUrl
    }).select().single()
}

export async function updateTeamById(id:string, data: {
    name?:string, logoUrl?:string
}){
    const supabase = await createClient()
    return supabase.from("teams").update({
        ...(data.name && {name:data.name}),
            ...(data.logoUrl && {logo_url:data.logoUrl})
    }).eq("id", id).select().single()
}

export async function deleteTeamById(id:string){
    const supabase = await createClient()
    return supabase.from("teams").delete().eq("id", id)
}