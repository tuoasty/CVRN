import {DBClient} from "@/shared/types/db";

export async function findAllRegions(supabase: DBClient){
    return supabase.from("regions").select("*").order("code", {ascending: true})
}

export async function findRegionByCode(supabase: DBClient, code: string){
    return supabase.from("regions").select("*").eq("code", code).single()
}