import {Err, Ok, Result} from "@/shared/types/result";
import {supabaseAdmin} from "@/server/supabase/admin";
import {deletePendingUser, findPendingUsersByEmail, insertUserRole} from "@/server/db/admin.repo";
import {SerializableError, serializeError} from "@/server/utils/serializeableError";


export async function inviteUser(
    email:string,
    role:"admin" | "super_admin" | "stat_tracker",
    invitedBy: string
): Promise<Result<null, SerializableError>> {
    try {
        const { error: inviteError} = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        });
        if(inviteError){
            return Err(serializeError(inviteError))
        }

        const {error:dbError} = await supabaseAdmin.from("pending_users").insert({
            email, role, invited_by:invitedBy,
        });
        if(dbError){
            return Err(serializeError(dbError))
        }
        return Ok(null)
    } catch(error){
        return Err(serializeError(error))
    }
}

export async function finalizeInvitedUser(userId:string, email:string){
    try {
        const {data:pending, error:pendingError} = await findPendingUsersByEmail(email);

        if(pendingError || !pending) {
            return Err({
                message:"Invite not found",
                name:"InviteNotFound"
            });
        }

        const {error: roleError} = await insertUserRole({
            userId, email, role:pending.role, promotedBy:pending.invited_by
        });

        if(roleError){
            return Err(serializeError(roleError))
        }
        const {error:deleteError} = await deletePendingUser(email)
        if(deleteError){
            return Err(serializeError(deleteError))
        }
        return Ok(null)
    } catch (error) {
        return Err(serializeError(error))
    }
}