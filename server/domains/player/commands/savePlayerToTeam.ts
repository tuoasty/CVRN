import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Player, PlayerTeamSeason} from "@/shared/types/db";
import {SavePlayerToTeamInput, SavePlayerInput} from "../types";
import {serializeError} from "@/server/utils/serializeableError";
import {findTeamById} from "@/server/db/teams.repo";
import {
    findPlayerByRobloxId,
    upsertPlayer,
    findPlayerCurrentTeam,
    addPlayerToTeam,
    countActivePlayersInTeam
} from "@/server/db/players.repo";
import {logger} from "@/server/utils/logger";

export async function savePlayerToTeam(
    supabase: DBClient,
    p: SavePlayerToTeamInput
): Promise<Result<{player: Player, teamSeason: PlayerTeamSeason}>> {
    try {
        const {data: team} = await findTeamById(supabase, p.teamId);
        if (!team) {
            logger.error({teamId: p.teamId}, "Team not found when saving player to team");
            return Err({
                name: "TeamNotFound",
                message: "Team does not exist"
            });
        }

        const seasonId = team.season_id;

        const { count, error: countError } = await countActivePlayersInTeam(supabase, p.teamId, seasonId);

        if (countError) {
            logger.error({ teamId: p.teamId, seasonId, error: countError }, "Failed to count team players");
            return Err(serializeError(countError));
        }

        if (count !== null && count >= 16) {
            logger.warn({ teamId: p.teamId, seasonId, currentCount: count }, "Team is at maximum capacity");
            return Err({
                name: "TeamAtCapacity",
                message: "Team already has 16 players (maximum capacity)"
            });
        }

        const {data: existingPlayer} = await findPlayerByRobloxId(supabase, p.robloxUserId);

        if (existingPlayer) {
            const {data: currentTeamSeason} = await findPlayerCurrentTeam(
                supabase,
                existingPlayer.id,
                seasonId
            );

            if (currentTeamSeason) {
                if (currentTeamSeason.team_id === p.teamId) {
                    logger.warn({robloxUserId: p.robloxUserId, teamId: p.teamId, seasonId}, "Player already in this team for this season");
                    return Err({
                        name: "PlayerAlreadyInTeam",
                        message: "Player is already a member of this team for this season"
                    });
                } else {
                    logger.warn({
                        robloxUserId: p.robloxUserId,
                        currentTeamId: currentTeamSeason.team_id,
                        requestedTeamId: p.teamId,
                        seasonId
                    }, "Player already in another team for this season");
                    return Err({
                        name: "PlayerAlreadyInTeam",
                        message: "Player is already a member of another team for this season"
                    });
                }
            }
        }

        const playerInput: SavePlayerInput = {
            robloxUserId: p.robloxUserId,
            username: p.username,
            displayName: p.displayName ?? null,
            avatarUrl: p.avatarUrl ?? null
        };

        const {data: player, error: playerError} = await upsertPlayer(supabase, playerInput);

        if (playerError) {
            logger.error({robloxUserId: p.robloxUserId, error: playerError}, "Failed to upsert player");
            return Err(serializeError(playerError));
        }

        if (!player) {
            return Err({
                name: "UpsertError",
                message: "Failed to save player"
            });
        }

        const {data: teamSeason, error: teamSeasonError} = await addPlayerToTeam(supabase, {
            playerId: player.id,
            teamId: p.teamId,
            seasonId
        });

        if (teamSeasonError) {
            logger.error({playerId: player.id, teamId: p.teamId, seasonId, error: teamSeasonError}, "Failed to add player to team");
            return Err(serializeError(teamSeasonError));
        }

        if (!teamSeason) {
            return Err({
                name: "AddToTeamError",
                message: "Failed to add player to team"
            });
        }

        return Ok({player, teamSeason});
    } catch (error) {
        logger.error({error}, "Unexpected error saving player to team");
        return Err(serializeError(error));
    }
}
