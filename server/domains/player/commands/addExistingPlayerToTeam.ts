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
        const { data: team } = await findTeamById(supabase, p.teamId);
        if (!team) {
            logger.error({ teamId: p.teamId }, "Team not found when adding existing player");
            return Err({
                name: "TeamNotFound",
                message: "Team does not exist",
                code: "NOT_FOUND"
            });
        }

        const seasonId = team.season_id;

        const { count, error: countError } = await countActivePlayersInTeam(supabase, p.teamId, seasonId);

        if (countError) {
            logger.error({ teamId: p.teamId, seasonId, error: countError }, "Failed to count team players");
            return Err(serializeError(countError, "DB_ERROR"));
        }

        if (count !== null && count >= 16) {
            logger.warn({ teamId: p.teamId, seasonId, currentCount: count }, "Team is at maximum capacity");
            return Err({
                name: "TeamAtCapacity",
                message: "Team already has 16 players (maximum capacity)",
                code: "CONFLICT"
            });
        }

        const { data: player } = await findPlayerById(supabase, p.playerId);
        if (!player) {
            logger.error({ playerId: p.playerId }, "Player not found when adding to team");
            return Err({
                name: "PlayerNotFound",
                message: "Player does not exist",
                code: "NOT_FOUND"
            });
        }

        const { data: currentTeamSeason } = await findPlayerCurrentTeam(
            supabase,
            p.playerId,
            seasonId
        );

        if (currentTeamSeason) {
            if (currentTeamSeason.team_id === p.teamId) {
                logger.warn({ playerId: p.playerId, teamId: p.teamId, seasonId }, "Player already in this team for this season");
                return Err({
                    name: "PlayerAlreadyInTeam",
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
                    name: "PlayerAlreadyInTeam",
                    message: "Player is already a member of another team for this season",
                    code: "CONFLICT"
                });
            }
        }

        const { data: teamSeason, error: teamSeasonError } = await addPlayerToTeam(supabase, {
            playerId: p.playerId,
            teamId: p.teamId,
            seasonId
        });

        if (teamSeasonError) {
            logger.error({ playerId: p.playerId, teamId: p.teamId, seasonId, error: teamSeasonError }, "Failed to add existing player to team");
            return Err(serializeError(teamSeasonError, "DB_ERROR"));
        }

        if (!teamSeason) {
            return Err({
                name: "AddToTeamError",
                message: "Failed to add player to team",
                code: "DB_ERROR"
            });
        }

        const syncResult = await lazySyncPlayer(supabase, player);
        const syncedPlayer = syncResult.ok ? syncResult.value : player;

        return Ok({ player: syncedPlayer, teamSeason });
    } catch (error) {
        logger.error({ error }, "Unexpected error adding existing player to team");
        return Err(serializeError(error));
    }
}
