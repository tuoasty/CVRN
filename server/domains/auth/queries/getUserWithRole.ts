import {DBClient} from "@/shared/types/db";

export async function getUserWithRole(supabase: DBClient){
    const {data: {user}} = await supabase.auth.getUser();
    if(!user) return null;

    const {data: roleData} = await supabase.from("user_roles").select("*").eq("user_id", user.id).single();
    return {
        user, role: roleData?.role || null, roleData
    };
}
