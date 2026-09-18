import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Player} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {findPlayerByRobloxId} from "@/server/db/players.repo";
import {logger} from "@/server/utils/logger";

export async function getPlayerByRobloxUserId(
    supabase: DBClient,
    robloxUserId: string
): Promise<Result<Player | null>> {
    try {
        const lookup = await findPlayerByRobloxId(supabase, robloxUserId);
        if (!lookup.ok) {
            logger.error({robloxUserId, error: lookup.error}, "Failed to find player by roblox user id");
            return lookup;
        }
        return Ok(lookup.value);
    } catch (error) {
        logger.error({error}, "Unexpected error finding player by roblox user id");
        return Err(serializeError(error));
    }
}
