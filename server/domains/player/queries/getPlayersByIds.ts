import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Player} from "@/shared/types/db";
import {PlayersByIdsInput} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {findPlayersByIds} from "@/server/db/players.repo";
import {lazySyncPlayer} from "../helpers/lazySyncPlayer";
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

        const syncedPlayers: Player[] = await Promise.all(
            result.value.map(async (player) => {
                const syncResult = await lazySyncPlayer(supabase, player as Player);
                return syncResult.ok ? syncResult.value : (player as Player);
            })
        );

        return Ok(syncedPlayers);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching players by IDs");
        return Err(serializeError(error));
    }
}
