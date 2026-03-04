import {supabaseAdmin} from "@/server/supabase/admin";

export async function findPendingUsersByEmail(email: string){
    return supabaseAdmin.from("pending_users").select("*").eq("email", email).single();
}
export async function insertUserRole(data:{
    userId:string,
    role:string,
    promotedBy:string
}){
    return supabaseAdmin.from("user_roles").insert({
        user_id:data.userId,
        role:data.role,
        promoted_by:data.promotedBy
    })
}

export async function deletePendingUser(email:string){
    return supabaseAdmin.from("pending_users").delete().eq("email", email)
}