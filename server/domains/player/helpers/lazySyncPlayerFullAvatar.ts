import {Ok, Result} from "@/shared/types/result";
import {DBClient, Player} from "@/shared/types/db";
import {updatePlayer} from "@/server/db/players.repo";
import {supabaseAdmin} from "@/server/supabase/admin";
import {runInBackground} from "@/server/utils/runInBackground";
import {getRobloxFullAvatarsById} from "@/server/roblox/users";
import {logger} from "@/server/utils/logger";
import {needsSync} from "./lazySyncPlayer";

async function doFullAvatarFetch(player: Player): Promise<Player> {
    if (!player.roblox_user_id) return player;

    logger.info({robloxUserId: player.roblox_user_id}, "lazySyncPlayerFullAvatar: fetching full avatar");

    const result = await getRobloxFullAvatarsById([player.roblox_user_id]);
    if (!result.ok) {
        logger.error({robloxUserId: player.roblox_user_id, error: result.error}, "lazySyncPlayerFullAvatar: Roblox API error");
        return player;
    }
    if (result.value.length === 0) {
        logger.warn({robloxUserId: player.roblox_user_id}, "lazySyncPlayerFullAvatar: Roblox returned empty array");
        return player;
    }

    logger.info({robloxUserId: player.roblox_user_id, results: result.value.map(a => ({targetId: a.targetId, state: a.state, hasUrl: !!a.imageUrl}))}, "lazySyncPlayerFullAvatar: Roblox response");

    const avatar = result.value.find(a => String(a.targetId) === String(player.roblox_user_id));
    if (!avatar) {
        logger.warn({robloxUserId: player.roblox_user_id, returnedIds: result.value.map(a => a.targetId)}, "lazySyncPlayerFullAvatar: no matching targetId in response");
        return player;
    }
    if (!avatar.imageUrl) {
        logger.warn({robloxUserId: player.roblox_user_id, state: avatar.state}, "lazySyncPlayerFullAvatar: imageUrl empty (likely Pending)");
        return player;
    }

    const updateResult = await updatePlayer(supabaseAdmin as unknown as DBClient, {
        robloxUserId: player.roblox_user_id,
        fullAvatarUrl: avatar.imageUrl,
        fullAvatarLastSyncedAt: new Date().toISOString(),
    });

    if (!updateResult.ok) {
        logger.error({robloxUserId: player.roblox_user_id, error: updateResult.error}, "lazySyncPlayerFullAvatar: failed to persist full avatar");
        return player;
    }

    logger.info({robloxUserId: player.roblox_user_id}, "lazySyncPlayerFullAvatar: full avatar saved");
    return updateResult.value;
}

export async function lazySyncPlayerFullAvatar(
    _supabase: DBClient,
    player: Player
): Promise<Result<Player>> {
    try {
        if (!player.roblox_user_id) {
            logger.warn({playerId: player.id}, "lazySyncPlayerFullAvatar: skipped — no roblox_user_id");
            return Ok(player);
        }

        // First visit: null → fetch synchronously so the page has the image immediately
        if (!player.full_avatar_url) {
            const updated = await doFullAvatarFetch(player);
            return Ok(updated);
        }

        // Stale: re-sync in background, return current player immediately
        if (needsSync(player.full_avatar_last_synced_at ?? null)) {
            runInBackground(() => doFullAvatarFetch(player), "full-avatar-sync");
        }

        return Ok(player);
    } catch (err) {
        logger.error({error: err}, "lazySyncPlayerFullAvatar: unexpected error");
        return Ok(player);
    }
}
