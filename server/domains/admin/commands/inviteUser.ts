import {Err, Ok, Result} from "@/shared/types/result";
import {getSupabaseAdmin} from "@/server/supabase/admin";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {InvitableRole} from "@/server/domains/admin/types";
import {deletePendingUser, normalizeEmail} from "@/server/db/admin.repo";
import {buildInviteEmailMetadata} from "@/server/domains/admin/helpers/inviteEmailMetadata";

export async function inviteUser(
    email:string,
    role:InvitableRole,
    invitedBy: string
): Promise<Result<null>> {
    try {
        const supabaseAdmin = getSupabaseAdmin();

        const siteUrl = process.env.SITE_URL!.replace(/\/+$/, "");
        const normalizedEmail = normalizeEmail(email);

        const clearResult = await deletePendingUser(normalizedEmail);
        if(!clearResult.ok){
            logger.error({email: normalizedEmail, role, invitedBy, error: clearResult.error}, "Failed to clear existing pending user");
            return clearResult;
        }

        const {data: pending, error:dbError} = await supabaseAdmin.from("pending_users").insert({
            email: normalizedEmail, role, invited_by:invitedBy,
        }).select("expires_at").single();
        if(dbError){
            logger.error({email: normalizedEmail, role, invitedBy, error: dbError}, "Failed to insert pending user");
            return Err(serializeError(dbError, "DB_ERROR"))
        }

        const { error: inviteError} = await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
            redirectTo: `${siteUrl}/auth/callback`,
            data: buildInviteEmailMetadata(role, pending?.expires_at ?? null),
        });
        if(inviteError){
            logger.error({email: normalizedEmail, role, invitedBy, error: inviteError}, "Failed to send invite email");
            await deletePendingUser(normalizedEmail);
            return Err(serializeError(inviteError, "INTEGRATION_ERROR"))
        }

        return Ok(null)
    } catch(error){
        logger.error({error}, "Unexpected error inviting user");
        return Err(serializeError(error))
    }
}
