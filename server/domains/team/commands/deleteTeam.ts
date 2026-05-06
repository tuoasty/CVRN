import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findTeamById, softDeleteTeamById} from "@/server/db/teams.repo";
import {findAllTeamPlayers, bulkRemovePlayersFromTeam} from "@/server/db/players.repo";
import {TeamIdInput} from "../types";

export async function deleteTeam(supabase: DBClient, p: TeamIdInput): Promise<Result<void>> {
    try {
        const teamLookup = await findTeamById(supabase, p.teamId);
        if (!teamLookup.ok) {
            logger.error({teamId: p.teamId, error: teamLookup.error}, "Failed to look up team");
            return teamLookup;
        }
        const team = teamLookup.value;
        if (!team || team.deleted_at) {
            logger.warn({teamId: p.teamId}, "Attempted to delete non-existent or already deleted team");
            return Err({
                message: "Team does not exist",
                code: "NOT_FOUND"
            });
        }

        const playersResult = await findAllTeamPlayers(supabase, p.teamId, team.season_id);
        if (!playersResult.ok) {
            logger.error({teamId: p.teamId, error: playersResult.error}, "Failed to check team players during deletion");
            return playersResult;
        }

        const playerIds = playersResult.value
            .filter(r => r.player)
            .map(r => r.player!.id);

        const removeResult = await bulkRemovePlayersFromTeam(supabase, team.season_id, playerIds);
        if (!removeResult.ok) {
            logger.error({teamId: p.teamId, playerCount: playerIds.length, error: removeResult.error}, "Failed to bulk remove players from team during deletion");
            return removeResult;
        }

        const deleteResult = await softDeleteTeamById(supabase, p.teamId);
        if (!deleteResult.ok) {
            logger.error({teamId: p.teamId, error: deleteResult.error}, "Failed to soft delete team");
            return deleteResult;
        }

        return Ok(undefined);
    } catch (error) {
        return Err(serializeError(error));
    }
}
