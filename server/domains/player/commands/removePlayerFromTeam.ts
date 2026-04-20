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
        const {data: player} = await findPlayerById(supabase, p.playerId);
        if (!player) {
            logger.error({playerId: p.playerId}, "Player not found when removing from team");
            return Err({
                name: "PlayerNotFound",
                message: "Player does not exist",
                code: "NOT_FOUND"
            });
        }

        const {data: currentTeamSeason} = await findPlayerCurrentTeam(
            supabase,
            p.playerId,
            p.seasonId
        );

        if (!currentTeamSeason) {
            logger.warn({playerId: p.playerId, seasonId: p.seasonId}, "Attempted to remove player not in a team for this season");
            return Err({
                name: "PlayerNotInTeam",
                message: "Player is not in a team for this season",
                code: "NOT_FOUND"
            });
        }

        const {data, error} = await removePlayerFromTeam(supabase, p);

        if (error) {
            logger.error({playerId: p.playerId, seasonId: p.seasonId, error}, "Failed to remove player from team");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Err({
                name: "RemoveError",
                message: "Failed to remove player from team",
                code: "DB_ERROR"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error removing player from team");
        return Err(serializeError(error));
    }
}
