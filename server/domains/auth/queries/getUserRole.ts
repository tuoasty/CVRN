import {DBClient} from "@/shared/types/db";

export async function getUserRole(supabase: DBClient, userId:string){
    const {data} = await supabase.from("user_roles").select("role").eq("user_id", userId).single()
    return data?.role || null;
}
