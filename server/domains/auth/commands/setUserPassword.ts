import {SerializableError, serializeError} from "@/server/utils/serializeableError";
import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {logger} from "@/server/utils/logger";
import {finalizeInvitedUser} from "@/server/domains/admin";

export async function setUserPassword(
    supabase: DBClient,
    password:string
):Promise<Result<null, SerializableError>>{
    try {
        const {
            data: {user},
        } = await supabase.auth.getUser();

        if(!user || !user.email){
            logger.error("Attempted to set password without authentication");
            return Err({
                message:"Not authenticated",
                code:"UNAUTHORIZED"
            });
        }

        const {error:passwordError} = await supabase.auth.updateUser({
            password,
        });
        if(passwordError){
            logger.error({userId: user.id, error: passwordError}, "Failed to update user password");
            return Err(serializeError(passwordError, "UNAUTHORIZED"))
        }

        const finalizeResult = await finalizeInvitedUser(
            user.id, user.email)
        if(!finalizeResult.ok){
            logger.error({userId: user.id, error: finalizeResult.error}, "Failed to finalize invited user");
            return finalizeResult
        }

        return Ok(null)
    } catch (error){
        logger.error({error}, "Unexpected error setting user password");
        return Err(serializeError(error));
    }
}
