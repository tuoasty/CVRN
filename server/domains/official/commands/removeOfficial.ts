import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findOfficialByRobloxId, deleteOfficial} from "@/server/db/official.repo";
import {RobloxUserIdInput} from "@/server/domains/player";

export async function removeOfficial(
    supabase: DBClient,
    p: RobloxUserIdInput
): Promise<Result<boolean>> {
    try {
        const {data: existingOfficial} = await findOfficialByRobloxId(supabase, p.robloxUserId);

        if (!existingOfficial) {
            logger.error({robloxUserId: p.robloxUserId}, "Official not found");
            return Err({
                name: "OfficialNotFound",
                message: "Official does not exist",
                code: "NOT_FOUND"
            });
        }

        const {error} = await deleteOfficial(supabase, existingOfficial.id);

        if (error) {
            logger.error({robloxUserId: p.robloxUserId, error}, "Failed to delete official");
            return Err(serializeError(error, "DB_ERROR"));
        }

        return Ok(true);
    } catch (error) {
        logger.error({error}, "Unexpected error removing official");
        return Err(serializeError(error));
    }
}
