import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findTeamById, softDeleteTeamById} from "@/server/db/teams.repo";
import {findAllTeamPlayers, removePlayerFromTeam} from "@/server/db/players.repo";
import {TeamIdInput} from "../types";

export async function deleteTeam(supabase: DBClient, p: TeamIdInput): Promise<Result<void>> {
    try {
        const {data: team} = await findTeamById(supabase, p.teamId);
        if (!team || team.deleted_at) {
            logger.warn({teamId: p.teamId}, "Attempted to delete non-existent or already deleted team");
            return Err({
                name: "TeamNotFound",
                message: "Team does not exist",
                code: "NOT_FOUND"
            });
        }

        const {data: activePlayersResult, error: checkError} = await findAllTeamPlayers(supabase, p.teamId, team.season_id);
        if (checkError) {
            logger.error({teamId: p.teamId, error: checkError}, "Failed to check team players during deletion");
            return Err(serializeError(checkError, "DB_ERROR"));
        }

        if (activePlayersResult && activePlayersResult.length > 0) {
            for (const record of activePlayersResult) {
                if (record.player) {
                    const {error: removeError} = await removePlayerFromTeam(supabase, {
                        playerId: record.player.id,
                        seasonId: team.season_id
                    });
                    if (removeError) {
                        logger.error({teamId: p.teamId, playerId: record.player.id, error: removeError}, "Failed to remove player from team during deletion");
                        return Err(serializeError(removeError, "DB_ERROR"));
                    }
                }
            }
        }

        const {error} = await softDeleteTeamById(supabase, p.teamId);
        if (error) {
            logger.error({teamId: p.teamId, error}, "Failed to soft delete team");
            return Err(serializeError(error, "DB_ERROR"));
        }

        return Ok(undefined);
    } catch (error) {
        return Err(serializeError(error));
    }
}
