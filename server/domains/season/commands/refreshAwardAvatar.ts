import {DBClient} from "@/shared/types/db";
import {Err, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonAwardPlayerRobloxId} from "@/server/db/seasonHistory.repo";
import {getRobloxFullAvatarsById} from "@/server/roblox/users";
import {storeAwardAvatar} from "./storeAwardAvatar";

export async function refreshAwardAvatar(
    supabase: DBClient,
    awardId: string
): Promise<Result<{url: string; path: string}>> {
    try {
        const robloxResult = await findSeasonAwardPlayerRobloxId(supabase, awardId);
        if (!robloxResult.ok) return robloxResult;
        const robloxId = robloxResult.value;
        if (!robloxId) return Err({message: "Award or player not found", code: "NOT_FOUND"});

        const avatarResult = await getRobloxFullAvatarsById([robloxId]);
        if (!avatarResult.ok) return avatarResult;

        const avatar = avatarResult.value.find(a => String(a.targetId) === robloxId);
        if (!avatar?.imageUrl) return Err({message: "Could not fetch avatar from Roblox", code: "INTEGRATION_ERROR"});

        return storeAwardAvatar(awardId, avatar.imageUrl);
    } catch (error) {
        logger.error({error, awardId}, "refreshAwardAvatar: unexpected error");
        return Err(serializeError(error));
    }
}
