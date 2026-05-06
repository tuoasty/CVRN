import {supabaseAdmin} from "@/server/supabase/admin";
import {Database} from "@/database.types";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

type PendingUser = Database["public"]["Tables"]["pending_users"]["Row"];

export async function findPendingUsersByEmail(email: string): Promise<Result<PendingUser | null>> {
    const {data, error} = await supabaseAdmin.from("pending_users").select("*").eq("email", email).single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data);
}

export async function insertUserRole(data: {
    userId: string,
    role: string,
    promotedBy: string | null
}): Promise<Result<true>> {
    const {error} = await supabaseAdmin.from("user_roles").insert({
        user_id: data.userId,
        role: data.role,
        promoted_by: data.promotedBy
    });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function deletePendingUser(email: string): Promise<Result<true>> {
    const {error} = await supabaseAdmin.from("pending_users").delete().eq("email", email);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
