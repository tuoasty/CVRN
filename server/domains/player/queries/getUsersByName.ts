import {getRobloxAvatarsById, getRobloxUserByName} from "@/server/roblox/users";
import {Err, Ok, Result} from "@/shared/types/result";
import {RobloxUserWithAvatar} from "@/shared/types/roblox";
import {DBClient} from "@/shared/types/db";
import {logger} from "@/server/utils/logger";

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
