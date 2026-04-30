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
        const lookup = await findOfficialByRobloxId(supabase, p.robloxUserId);
        if (!lookup.ok) {
            logger.error({robloxUserId: p.robloxUserId, error: lookup.error}, "Failed to look up official");
            return lookup;
        }
        if (!lookup.value) {
            logger.error({robloxUserId: p.robloxUserId}, "Official not found");
            return Err({
                message: "Official does not exist",
                code: "NOT_FOUND"
            });
        }

        const deleteResult = await deleteOfficial(supabase, lookup.value.id);
        if (!deleteResult.ok) {
            logger.error({robloxUserId: p.robloxUserId, error: deleteResult.error}, "Failed to delete official");
            return deleteResult;
        }
        return Ok(true);
    } catch (error) {
        logger.error({error}, "Unexpected error removing official");
        return Err(serializeError(error));
    }
}
