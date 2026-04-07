import {Err, Ok, Result} from "@/shared/types/result";
import {supabaseAdmin} from "@/server/supabase/admin";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function inviteUser(
    email:string,
    role:"admin" | "super_admin" | "stat_tracker",
    invitedBy: string
): Promise<Result<null>> {
    try {
        const { error: inviteError} = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        });
        if(inviteError){
            logger.error({email, role, invitedBy, error: inviteError}, "Failed to send invite email");
            return Err(serializeError(inviteError))
        }

        const {error:dbError} = await supabaseAdmin.from("pending_users").insert({
            email, role, invited_by:invitedBy,
        });
        if(dbError){
            logger.error({email, role, invitedBy, error: dbError}, "Failed to insert pending user");
            return Err(serializeError(dbError))
        }
        return Ok(null)
    } catch(error){
        logger.error({error}, "Unexpected error inviting user");
        return Err(serializeError(error))
    }
}
