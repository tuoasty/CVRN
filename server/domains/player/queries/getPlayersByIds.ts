import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Player} from "@/shared/types/db";
import {PlayersByIdsInput} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {findPlayersByIds} from "@/server/db/players.repo";
import {logger} from "@/server/utils/logger";

export async function getPlayersByIds(
    supabase: DBClient,
    p: PlayersByIdsInput
): Promise<Result<Player[]>> {
    try {
        if (p.playerIds.length === 0) {
            return Ok([]);
        }

        const result = await findPlayersByIds(supabase, p.playerIds);
        if (!result.ok) {
            logger.error({playerIds: p.playerIds, error: result.error}, "Failed to fetch players by IDs");
            return result;
        }

        return Ok(result.value);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching players by IDs");
        return Err(serializeError(error));
    }
}
