import * as repository from "@/lib/repository/robloxRepository";
import {Err, Ok, Result} from "@/lib/result";
import {RobloxUserWithAvatar} from "@/lib/types/robloxUserWithAvatar";

export async function getRobloxUsers(username: string): Promise<Result<RobloxUserWithAvatar[]>>{
    const result = await repository.findUsersByName(username);

    if(!result.ok){
        console.error("failed to fetch user, ", result.error);
        return Err(result.error);
    }

    const users = result.value;

    if(users.length === 0){
        return Ok([]);
    }

    const userIds = users.map(user => user.id);
    const avatarsResult = await repository.findAvatarsByIds(userIds);

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