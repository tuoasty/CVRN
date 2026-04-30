import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, PlayerTeamSeason} from "@/shared/types/db";
import {RemovePlayerFromTeamInput} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {findPlayerById, findPlayerCurrentTeam, removePlayerFromTeam} from "@/server/db/players.repo";
import {logger} from "@/server/utils/logger";

export async function removePlayerFromTeamService(
    supabase: DBClient,
    p: RemovePlayerFromTeamInput
): Promise<Result<PlayerTeamSeason>> {
    try {
        const playerLookup = await findPlayerById(supabase, p.playerId);
        if (!playerLookup.ok) {
            logger.error({playerId: p.playerId, error: playerLookup.error}, "Failed to look up player");
            return playerLookup;
        }
        if (!playerLookup.value) {
            logger.error({playerId: p.playerId}, "Player not found when removing from team");
            return Err({
                message: "Player does not exist",
                code: "NOT_FOUND"
            });
        }

        const currentLookup = await findPlayerCurrentTeam(supabase, p.playerId, p.seasonId);
        if (!currentLookup.ok) {
            logger.error({playerId: p.playerId, seasonId: p.seasonId, error: currentLookup.error}, "Failed to look up player team");
            return currentLookup;
        }
        if (!currentLookup.value) {
            logger.warn({playerId: p.playerId, seasonId: p.seasonId}, "Attempted to remove player not in a team for this season");
            return Err({
                message: "Player is not in a team for this season",
                code: "NOT_FOUND"
            });
        }

        const result = await removePlayerFromTeam(supabase, p);
        if (!result.ok) {
            logger.error({playerId: p.playerId, seasonId: p.seasonId, error: result.error}, "Failed to remove player from team");
            return result;
        }
        return Ok(result.value);
    } catch (error) {
        logger.error({error}, "Unexpected error removing player from team");
        return Err(serializeError(error));
    }
}
