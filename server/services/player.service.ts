import {getRobloxAvatarsById, getRobloxUserByName} from "@/server/roblox/users";
import {Err, Ok, Result} from "@/shared/types/result";
import {RobloxUserWithAvatar} from "@/shared/types/roblox";
import {DBClient, Player, PlayerTeamSeason} from "@/shared/types/db";
import {
    SavePlayerToTeamInput,
    RemovePlayerFromTeamInput,
    TeamPlayersInput,
    SavePlayerInput,
    PlayersByIdsInput,
    AddExistingPlayerToTeamInput,
    SearchPlayersInput,
    PlayerWithTeamInfo
} from "@/server/dto/player.dto";
import {serializeError} from "@/server/utils/serializeableError";
import {findTeamById} from "@/server/db/teams.repo";
import {
    findPlayerByRobloxId,
    upsertPlayer,
    findAllTeamPlayers,
    findPlayerCurrentTeam,
    addPlayerToTeam,
    removePlayerFromTeam,
    updatePlayer,
    findPlayerById, findPlayersByIds, findPlayersBySimilarity
} from "@/server/db/players.repo";
import {logger} from "@/server/utils/logger";

const SYNC_INTERVAL = 1000 * 60 * 60;

export async function getUsersByName(
    supabase: DBClient,
    username: string
): Promise<Result<RobloxUserWithAvatar[]>> {
    const result = await getRobloxUserByName(username);

    if (!result.ok) {
        logger.error({username, error: result.error}, "Failed to fetch Roblox user by name");
        return Err(result.error);
    }

    const users = result.value;

    if (users.length === 0) {
        return Ok([]);
    }

    const userIds = users.map(user => user.id);
    const avatarsResult = await getRobloxAvatarsById(userIds);

    if (!avatarsResult.ok) {
        logger.error({userIds, error: avatarsResult.error}, "Failed to fetch Roblox avatars");
        return Err(avatarsResult.error);
    }

    const usersWithAvatars: RobloxUserWithAvatar[] = users.map(user => {
        const avatar = avatarsResult.value.find(av => av.targetId === user.id);

        return {
            ...user,
            avatarUrl: avatar?.imageUrl || ""
        };
    });

    return Ok(usersWithAvatars);
}

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
                message: "Player does not exist"
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
                message: "Player is not in a team for this season"
            });
        }

        const {data, error} = await removePlayerFromTeam(supabase, p);

        if (error) {
            logger.error({playerId: p.playerId, seasonId: p.seasonId, error}, "Failed to remove player from team");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "RemoveError",
                message: "Failed to remove player from team"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error removing player from team");
        return Err(serializeError(error));
    }
}

export async function getTeamPlayers(
    supabase: DBClient,
    p: TeamPlayersInput
): Promise<Result<Player[]>> {
    try {
        const {data, error} = await findAllTeamPlayers(supabase, p.teamId, p.seasonId);
        if (error) {
            logger.error({teamId: p.teamId, seasonId: p.seasonId, error}, "Failed to fetch team players");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch team players",
                name: "FetchError"
            });
        }

        const syncedPlayers: Player[] = [];

        for (const record of data) {
            if (!record.player) {
                continue;
            }

            const result = await lazySyncPlayer(supabase, record.player);

            if (result.ok) {
                syncedPlayers.push(result.value);
            } else {
                syncedPlayers.push(record.player);
            }
        }

        return Ok(syncedPlayers);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching team players");
        return Err(serializeError(error));
    }
}

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
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch players",
                name: "FetchError"
            });
        }

        const syncedPlayers: Player[] = [];

        for (const player of data) {
            const result = await lazySyncPlayer(supabase, player as Player);

            if (result.ok) {
                syncedPlayers.push(result.value);
            } else {
                syncedPlayers.push(player as Player);
            }
        }

        return Ok(syncedPlayers);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching players by IDs");
        return Err(serializeError(error));
    }
}

export async function searchPlayersInDatabase(
    supabase: DBClient,
    p: SearchPlayersInput
): Promise<Result<PlayerWithTeamInfo[]>> {
    try {
        const { data, error } = await findPlayersBySimilarity(supabase, p.query);

        if (error) {
            logger.error({ query: p.query, error }, "Failed to search players in database");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Failed to search players",
                name: "SearchError"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({ error }, "Unexpected error searching players in database");
        return Err(serializeError(error));
    }
}

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
                message: "Team does not exist"
            });
        }

        const seasonId = team.season_id;

        const { data: player } = await findPlayerById(supabase, p.playerId);
        if (!player) {
            logger.error({ playerId: p.playerId }, "Player not found when adding to team");
            return Err({
                name: "PlayerNotFound",
                message: "Player does not exist"
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
                    message: "Player is already a member of this team for this season"
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
                    message: "Player is already a member of another team for this season"
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
            return Err(serializeError(teamSeasonError));
        }

        if (!teamSeason) {
            return Err({
                name: "AddToTeamError",
                message: "Failed to add player to team"
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

export async function lazySyncPlayer(
    supabase: DBClient,
    player: Player
): Promise<Result<Player>> {
    try {
        if (!needsSync(player.last_synced_at ?? null)) {
            return Ok(player);
        }

        if (!player.username) {
            return Ok(player);
        }

        const userResult = await getRobloxUserByName(player.username);
        if (!userResult.ok || userResult.value.length === 0) {
            logger.error({username: player.username, error: userResult.ok ? null : userResult.error}, "Failed to fetch Roblox user during lazy sync");
            return Ok(player);
        }

        const user = userResult.value[0];
        if (!user?.id) {
            return Ok(player);
        }

        const avatarResult = await getRobloxAvatarsById([user.id]);
        let avatarUrl: string | null = player.avatar_url;
        if (avatarResult.ok) {
            const avatar = avatarResult.value.find(
                a => a.targetId === user.id
            );

            if (avatar?.imageUrl) {
                avatarUrl = avatar.imageUrl;
            }
        } else {
            logger.error({userId: user.id, error: avatarResult.error}, "Failed to fetch avatar during lazy sync");
        }

        const {data, error} = await updatePlayer(supabase, {
            robloxUserId: String(user.id),
            username: user.name,
            displayName: user.displayName ?? null,
            avatarUrl,
            lastSyncedAt: new Date().toISOString(),
        });

        if (error) {
            logger.error({robloxUserId: String(user.id), error}, "Failed to update player during lazy sync");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "UpdateError",
                message: "Failed to update player"
            });
        }

        return Ok(data);

    } catch (err) {
        logger.error({error: err}, "Unexpected error during lazy sync");
        return Err(serializeError(err));
    }
}

function needsSync(lastSynced: string | null) {
    if (!lastSynced) return true;

    const last = new Date(lastSynced).getTime();
    const now = Date.now();

    return now - last > SYNC_INTERVAL;
}