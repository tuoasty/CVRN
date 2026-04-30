import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Player, PlayerTeamSeason} from "@/shared/types/db";
import {AddExistingPlayerToTeamInput} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {findTeamById} from "@/server/db/teams.repo";
import {
    findPlayerById,
    findPlayerCurrentTeam,
    addPlayerToTeam,
    countActivePlayersInTeam
} from "@/server/db/players.repo";
import {lazySyncPlayer} from "../helpers/lazySyncPlayer";
import {logger} from "@/server/utils/logger";

export async function addExistingPlayerToTeam(
    supabase: DBClient,
    p: AddExistingPlayerToTeamInput
): Promise<Result<{ player: Player, teamSeason: PlayerTeamSeason }>> {
    try {
        const teamLookup = await findTeamById(supabase, p.teamId);
        if (!teamLookup.ok) {
            logger.error({ teamId: p.teamId, error: teamLookup.error }, "Failed to look up team");
            return teamLookup;
        }
        const team = teamLookup.value;
        if (!team) {
            logger.error({ teamId: p.teamId }, "Team not found when adding existing player");
            return Err({
                message: "Team does not exist",
                code: "NOT_FOUND"
            });
        }

        const seasonId = team.season_id;

        const countResult = await countActivePlayersInTeam(supabase, p.teamId, seasonId);
        if (!countResult.ok) {
            logger.error({ teamId: p.teamId, seasonId, error: countResult.error }, "Failed to count team players");
            return countResult;
        }

        if (countResult.value >= 16) {
            logger.warn({ teamId: p.teamId, seasonId, currentCount: countResult.value }, "Team is at maximum capacity");
            return Err({
                message: "Team already has 16 players (maximum capacity)",
                code: "CONFLICT"
            });
        }

        const playerLookup = await findPlayerById(supabase, p.playerId);
        if (!playerLookup.ok) {
            logger.error({ playerId: p.playerId, error: playerLookup.error }, "Failed to look up player");
            return playerLookup;
        }
        const player = playerLookup.value;
        if (!player) {
            logger.error({ playerId: p.playerId }, "Player not found when adding to team");
            return Err({
                message: "Player does not exist",
                code: "NOT_FOUND"
            });
        }

        const currentLookup = await findPlayerCurrentTeam(supabase, p.playerId, seasonId);
        if (!currentLookup.ok) {
            logger.error({ playerId: p.playerId, seasonId, error: currentLookup.error }, "Failed to look up player team");
            return currentLookup;
        }
        const currentTeamSeason = currentLookup.value;

        if (currentTeamSeason) {
            if (currentTeamSeason.team_id === p.teamId) {
                logger.warn({ playerId: p.playerId, teamId: p.teamId, seasonId }, "Player already in this team for this season");
                return Err({
                    message: "Player is already a member of this team for this season",
                    code: "CONFLICT"
                });
            } else {
                logger.warn({
                    playerId: p.playerId,
                    currentTeamId: currentTeamSeason.team_id,
                    requestedTeamId: p.teamId,
                    seasonId
                }, "Player already in another team for this season");
                return Err({
                    message: "Player is already a member of another team for this season",
                    code: "CONFLICT"
                });
            }
        }

        const teamSeasonResult = await addPlayerToTeam(supabase, {
            playerId: p.playerId,
            teamId: p.teamId,
            seasonId
        });
        if (!teamSeasonResult.ok) {
            logger.error({ playerId: p.playerId, teamId: p.teamId, seasonId, error: teamSeasonResult.error }, "Failed to add existing player to team");
            return teamSeasonResult;
        }

        const syncResult = await lazySyncPlayer(supabase, player);
        const syncedPlayer = syncResult.ok ? syncResult.value : player;

        return Ok({ player: syncedPlayer, teamSeason: teamSeasonResult.value });
    } catch (error) {
        logger.error({ error }, "Unexpected error adding existing player to team");
        return Err(serializeError(error));
    }
}
