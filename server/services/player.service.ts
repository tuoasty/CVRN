import {getRobloxAvatarsById, getRobloxUserByName} from "@/server/roblox/users";
import {Err, Ok, Result} from "@/shared/types/result";
import {RobloxUserWithAvatar} from "@/shared/types/roblox";
import {DBClient, Player} from "@/shared/types/db";
import {GetTeamPlayers, SavePlayerInput} from "@/server/dto/player.dto";
import {serializeError} from "@/server/utils/serializeableError";
import {findTeamById} from "@/server/db/teams.repo";
import {findAllTeamPlayers, updatePlayer, upsertPlayer} from "@/server/db/players.repo";

const SYNC_INTERVAL = 1000 * 60 * 60;

export async function getUsersByName(supabase: DBClient, username: string): Promise<Result<RobloxUserWithAvatar[]>>{
    const result = await getRobloxUserByName(username);

    if(!result.ok){
        console.error("failed to fetch user, ", result.error);
        return Err(result.error);
    }

    const users = result.value;

    if(users.length === 0){
        return Ok([]);
    }

    const userIds = users.map(user => user.id);
    const avatarsResult = await getRobloxAvatarsById(userIds);

    if(!avatarsResult.ok){
        console.error("failed to fetch avatars, ", avatarsResult.error);
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

export async function savePlayer(
    supabase: DBClient,
    p: SavePlayerInput
): Promise<Result<Player>> {
    try {
        if(p.teamId){
            const {data:team} = await findTeamById(supabase, p.teamId)
            if(!team){
                return Err({
                    name:"TeamNotFound",
                    message:"Team does not exist"
                })
            }
        }

        const {data, error} = await upsertPlayer(supabase, p)
        if(error){
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
        return Err(serializeError(error))
    }
}

export async function getTeamPlayers(
    supabase: DBClient,
    p:GetTeamPlayers
) : Promise<Result<Player[]>>{
    try {
        const { data, error } = await findAllTeamPlayers(supabase, p)
        if(error){
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

        console.log("Lazy syncing player:", player.username);
        const userResult = await getRobloxUserByName(player.username);
        if (!userResult.ok || userResult.value.length === 0) {
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
        }

        const { data, error } = await updatePlayer(supabase, {
            robloxUserId: String(user.id),
            username: user.name,
            displayName: user.displayName ?? null,
            avatarUrl,
            lastSyncedAt: new Date().toISOString(),
        });

        if (error) {
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
        return Err(serializeError(err));
    }
}


function needsSync(lastSynced: string | null){
    if(!lastSynced) return true;

    const last = new Date(lastSynced).getTime()
    const now = Date.now()

    return now - last > SYNC_INTERVAL
}