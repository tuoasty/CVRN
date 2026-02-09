import {getRobloxAvatarsById, getRobloxUserByName} from "@/server/roblox/users";
import {Err, Ok, Result} from "@/shared/types/result";
import {RobloxUserWithAvatar} from "@/shared/types/roblox";
import {DBClient, Player} from "@/shared/types/db";
import {AddPlayerToTeamInput} from "@/server/dto/player.dto";
import {SerializableError, serializeError} from "@/server/utils/serializeableError";
import {findTeamById} from "@/server/db/teams.repo";
import {upsertPlayer} from "@/server/db/players.repo";

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
    p: AddPlayerToTeamInput
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