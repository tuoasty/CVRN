import {DBClient} from "@/shared/types/db";

export async function hasRole(supabase: DBClient, userId:string): Promise<boolean>{
    const {data} = await supabase.from("user_roles").select("user_id").eq("user_id", userId).single();
    return !!data
}

