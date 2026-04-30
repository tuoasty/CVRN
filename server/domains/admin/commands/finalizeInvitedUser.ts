import {Err, Ok, Result} from "@/shared/types/result";
import {deletePendingUser, findPendingUsersByEmail, insertUserRole} from "@/server/db/admin.repo";
import {SerializableError, serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";

export async function finalizeInvitedUser(userId: string, email: string): Promise<Result<null, SerializableError>> {
    try {
        const pendingResult = await findPendingUsersByEmail(email);
        if (!pendingResult.ok) {
            logger.error({userId, email, error: pendingResult.error}, "Failed to fetch pending user");
            return pendingResult;
        }
        if (!pendingResult.value) {
            logger.error({userId, email}, "Pending user invite not found");
            return Err({message: "Invite not found", code: "NOT_FOUND"});
        }

        const pending = pendingResult.value;

        const roleResult = await insertUserRole({
            userId, role: pending.role, promotedBy: pending.invited_by
        });
        if (!roleResult.ok) {
            logger.error({userId, email, role: pending.role, error: roleResult.error}, "Failed to insert user role");
            return roleResult;
        }

        const deleteResult = await deletePendingUser(email);
        if (!deleteResult.ok) {
            logger.error({email, error: deleteResult.error}, "Failed to delete pending user");
            return deleteResult;
        }

        return Ok(null);
    } catch (error) {
        logger.error({error}, "Unexpected error finalizing invited user");
        return Err(serializeError(error));
    }
}
