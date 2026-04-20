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

        const {data, error} = await findPlayersByIds(supabase, p.playerIds);

        if (error) {
            logger.error({playerIds: p.playerIds, error}, "Failed to fetch players by IDs");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch players",
                name: "FetchError",
                code: "DB_ERROR"
            });
        }

        const syncedPlayers: Player[] = await Promise.all(
            data.map(async (player) => {
                const result = await lazySyncPlayer(supabase, player as Player);
                return result.ok ? result.value : (player as Player);
            })
        );

        return Ok(syncedPlayers);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching players by IDs");
        return Err(serializeError(error));
    }
}
