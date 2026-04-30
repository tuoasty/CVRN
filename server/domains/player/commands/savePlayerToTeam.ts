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
        const teamLookup = await findTeamById(supabase, p.teamId);
        if (!teamLookup.ok) {
            logger.error({teamId: p.teamId, error: teamLookup.error}, "Failed to look up team");
            return teamLookup;
        }
        const team = teamLookup.value;
        if (!team) {
            logger.error({teamId: p.teamId}, "Team not found when saving player to team");
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

        const existingLookup = await findPlayerByRobloxId(supabase, p.robloxUserId);
        if (!existingLookup.ok) {
            logger.error({robloxUserId: p.robloxUserId, error: existingLookup.error}, "Failed to look up player by roblox id");
            return existingLookup;
        }
        const existingPlayer = existingLookup.value;

        if (existingPlayer) {
            const currentLookup = await findPlayerCurrentTeam(supabase, existingPlayer.id, seasonId);
            if (!currentLookup.ok) {
                logger.error({playerId: existingPlayer.id, seasonId, error: currentLookup.error}, "Failed to look up player team");
                return currentLookup;
            }
            const currentTeamSeason = currentLookup.value;

            if (currentTeamSeason) {
                if (currentTeamSeason.team_id === p.teamId) {
                    logger.warn({robloxUserId: p.robloxUserId, teamId: p.teamId, seasonId}, "Player already in this team for this season");
                    return Err({
                        message: "Player is already a member of this team for this season",
                        code: "CONFLICT"
                    });
                } else {
                    logger.warn({
                        robloxUserId: p.robloxUserId,
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
        }

        const playerInput: SavePlayerInput = {
            robloxUserId: p.robloxUserId,
            username: p.username,
            displayName: p.displayName ?? null,
            avatarUrl: p.avatarUrl ?? null
        };

        const playerResult = await upsertPlayer(supabase, playerInput);
        if (!playerResult.ok) {
            logger.error({robloxUserId: p.robloxUserId, error: playerResult.error}, "Failed to upsert player");
            return playerResult;
        }
        const player = playerResult.value;

        const teamSeasonResult = await addPlayerToTeam(supabase, {
            playerId: player.id,
            teamId: p.teamId,
            seasonId
        });
        if (!teamSeasonResult.ok) {
            logger.error({playerId: player.id, teamId: p.teamId, seasonId, error: teamSeasonResult.error}, "Failed to add player to team");
            return teamSeasonResult;
        }

        return Ok({player, teamSeason: teamSeasonResult.value});
    } catch (error) {
        logger.error({error}, "Unexpected error saving player to team");
        return Err(serializeError(error));
    }
}
