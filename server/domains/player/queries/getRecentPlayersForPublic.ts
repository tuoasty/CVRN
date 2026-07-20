import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {PlayerSearchHit} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {findRecentPlayers} from "@/server/db/players.repo";
import {logger} from "@/server/utils/logger";

export async function getRecentPlayersForPublic(
    supabase: DBClient
): Promise<Result<PlayerSearchHit[]>> {
    try {
        const result = await findRecentPlayers(supabase);
        if (!result.ok) {
            logger.error({error: result.error}, "Failed to load recent players");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({error}, "Unexpected error loading recent players");
        return Err(serializeError(error));
    }
}
