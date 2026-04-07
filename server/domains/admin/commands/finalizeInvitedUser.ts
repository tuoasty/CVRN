import {Err, Ok} from "@/shared/types/result";
import {deletePendingUser, findPendingUsersByEmail, insertUserRole} from "@/server/db/admin.repo";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function finalizeInvitedUser(userId:string, email:string){
    try {
        const {data:pending, error:pendingError} = await findPendingUsersByEmail(email);

        if(pendingError || !pending) {
            logger.error({userId, email, error: pendingError}, "Pending user invite not found");
            return Err({
                message:"Invite not found",
                name:"InviteNotFound"
            });
        }

        const {error: roleError} = await insertUserRole({
            userId, role:pending.role, promotedBy:pending.invited_by
        });

        if(roleError){
            logger.error({userId, email, role: pending.role, error: roleError}, "Failed to insert user role");
            return Err(serializeError(roleError))
        }
        const {error:deleteError} = await deletePendingUser(email)
        if(deleteError){
            logger.error({email, error: deleteError}, "Failed to delete pending user");
            return Err(serializeError(deleteError))
        }
        return Ok(null)
    } catch (error) {
        logger.error({error}, "Unexpected error finalizing invited user");
        return Err(serializeError(error))
    }
}
