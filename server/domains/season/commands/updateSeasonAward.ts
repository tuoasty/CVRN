import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {updateSeasonAwardName, updateSeasonAwardPlayer} from "@/server/db/seasonHistory.repo";
import {getRobloxFullAvatarsById} from "@/server/roblox/users";
import {storeAwardAvatar} from "./storeAwardAvatar";
import {UpdateSeasonAwardInput} from "../types";

export async function updateSeasonAward(
    supabase: DBClient,
    p: UpdateSeasonAwardInput
): Promise<Result<true>> {
    try {
        const nameResult = await updateSeasonAwardName(supabase, p.awardId, p.awardName);
        if (!nameResult.ok || !p.playerId) return nameResult;

        const playerResult = await updateSeasonAwardPlayer(supabase, p.awardId, p.playerId);
        if (!playerResult.ok) return playerResult;

        const {data: player, error: playerError} = await supabase
            .from("players")
            .select("roblox_user_id")
            .eq("id", p.playerId)
            .maybeSingle();
        if (playerError || player?.roblox_user_id == null) {
            logger.error({awardId: p.awardId, error: playerError}, "updateSeasonAward: could not read new player's roblox id");
            return Ok(true);
        }

        const robloxId = String(player.roblox_user_id);
        const avatarResult = await getRobloxFullAvatarsById([robloxId]);
        const cdnUrl = avatarResult.ok
            ? avatarResult.value.find(a => String(a.targetId) === robloxId)?.imageUrl
            : undefined;
        if (!cdnUrl) {
            logger.error({awardId: p.awardId}, "updateSeasonAward: avatar fetch failed for new player");
            return Ok(true);
        }

        const storeResult = await storeAwardAvatar(p.awardId, cdnUrl);
        if (!storeResult.ok) logger.error({awardId: p.awardId, error: storeResult.error}, "updateSeasonAward: failed to store avatar");
        return Ok(true);
    } catch (error) {
        logger.error({error, awardId: p.awardId}, "updateSeasonAward: unexpected error");
        return Err(serializeError(error));
    }
}
