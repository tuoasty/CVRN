import {getRobloxAvatarsById, getRobloxUserByName} from "@/server/roblox/users";
import {Err, Ok, Result} from "@/shared/types/result";
import {RobloxUserWithAvatar} from "@/shared/types/roblox";
import {DBClient, Player} from "@/shared/types/db";
import {RobloxUserIdInput, SavePlayerInput} from "@/server/dto/player.dto";
import {serializeError} from "@/server/utils/serializeableError";
import {findTeamById} from "@/server/db/teams.repo";
import {findAllTeamPlayers, findPlayerByRobloxId, updatePlayer, upsertPlayer} from "@/server/db/players.repo";
import {TeamIdInput} from "@/server/dto/team.dto";
import {logger} from "@/server/utils/logger";

const SYNC_INTERVAL = 1000 * 60 * 60;

export async function getUsersByName(supabase: DBClient, username: string): Promise<Result<RobloxUserWithAvatar[]>>{
    const result = await getRobloxUserByName(username);

    if(!result.ok){
        logger.error({username, error: result.error}, "Failed to fetch Roblox user by name");
        return Err(result.error);
    }

    const users = result.value;

    if(users.length === 0){
        return Ok([]);
    }

    const userIds = users.map(user => user.id);
    const avatarsResult = await getRobloxAvatarsById(userIds);

    if(!avatarsResult.ok){
        logger.error({userIds, error: avatarsResult.error}, "Failed to fetch Roblox avatars");
        return Err(avatarsResult.error);
    }

    const usersWithAvatars: RobloxUserWithAvatar[] = users.map(user => {
        const avatar = avatarsResult.value.find(av => av.targetId === user.id);

        return {
            ...user,
            id: String(user.id),
            avatarUrl: avatar?.imageUrl || ""
        };
    });

    return Ok(usersWithAvatars);
}

export async function savePlayer(
    supabase: DBClient,
    p: SavePlayerInput
): Promise<Result<Player>> {
    try {
        if(p.teamId){
            const {data:team} = await findTeamById(supabase, p.teamId)
            if(!team){
                logger.error({teamId: p.teamId, robloxUserId: p.robloxUserId}, "Team not found when saving player");
                return Err({
                    name:"TeamNotFound",
                    message:"Team does not exist"
                })
            }

            const {data: existingPlayer} = await findPlayerByRobloxId(supabase, p.robloxUserId)
            if(existingPlayer?.team_id){
                if(existingPlayer?.team_id === p.teamId){
                    logger.warn({robloxUserId: p.robloxUserId, teamId: p.teamId}, "Player already in this team");
                    return Err({
                        name:"PlayerAlreadyInTeam",
                        message:"Player is already a member of this team"
                    })
                } else {
                    logger.warn({robloxUserId: p.robloxUserId, currentTeamId: existingPlayer.team_id, requestedTeamId: p.teamId}, "Player already in another team");
                    return Err({
                        name:"PlayerAlreadyInTeam",
                        message:"Player is already a member of another team"
                    })
                }
            }
        }

        const {data, error} = await upsertPlayer(supabase, p)
        if(error){
            logger.error({robloxUserId: p.robloxUserId, error}, "Failed to upsert player");
            return Err(serializeError(error))
        }

        if(!data){
            return Err({
                name:"UpsertError",
                message:"Failed to save player"
            })
        }

        return Ok(data)
    } catch (error){
        logger.error({error}, "Unexpected error saving player");
        return Err(serializeError(error))
    }
}

export async function removePlayerFromTeam(supabase:DBClient, p:RobloxUserIdInput) : Promise<Result<Player>>{
    try {
        const { data: existingPlayer } = await findPlayerByRobloxId(supabase, p.robloxUserId)
        if (!existingPlayer) {
            logger.error({robloxUserId: p.robloxUserId}, "Player not found when removing from team");
            return Err({
                name:"PlayerNotFound",
                message:"Player does not exist"
            })
        }

        if (!existingPlayer.team_id) {
            logger.warn({robloxUserId: p.robloxUserId}, "Attempted to remove player not in a team");
            return Err({
                name: "PlayerNotInTeam",
                message: "Player is not in a team"
            })
        }

        const { data, error } = await updatePlayer(supabase, {
            robloxUserId: p.robloxUserId,
            teamId: null
        })

        if (error) {
            logger.error({robloxUserId: p.robloxUserId, error}, "Failed to update player when removing from team");
            return Err(serializeError(error))
        }

        if (!data) {
            return Err({
                name: "UpdateError",
                message: "Failed to remove player from team"
            })
        }

        return Ok(data)
    } catch (error) {
        logger.error({error}, "Unexpected error removing player from team");
        return Err(serializeError(error))
    }
}

export async function getTeamPlayers(
    supabase: DBClient,
    p:TeamIdInput
) : Promise<Result<Player[]>>{
    try {
        const { data, error } = await findAllTeamPlayers(supabase, p.teamId)
        if(error){
            logger.error({teamId: p.teamId, error}, "Failed to fetch team players");
            return Err(serializeError(error))
        }

        if(!data){
            return Err({
                message:"Failed to fetch team players",
                name:"FetchError"
            })
        }

        const syncedPlayers: Player[] = [];

        for (const player of data) {
            const result = await lazySyncPlayer(supabase, player);

            if (result.ok) {
                syncedPlayers.push(result.value);
            } else {
                syncedPlayers.push(player);
            }
        }

        return Ok(syncedPlayers);
    } catch (error){
        logger.error({error}, "Unexpected error fetching team players");
        return Err(serializeError(error))
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

        const { data, error } = await updatePlayer(supabase, {
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


function needsSync(lastSynced: string | null){
    if(!lastSynced) return true;

    const last = new Date(lastSynced).getTime()
    const now = Date.now()

    return now - last > SYNC_INTERVAL
}