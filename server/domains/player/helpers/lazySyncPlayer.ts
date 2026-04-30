import {getRobloxAvatarsById, getRobloxUsersById} from "@/server/roblox/users";
import {Ok, Result} from "@/shared/types/result";
import {DBClient, Player} from "@/shared/types/db";
import {updatePlayer} from "@/server/db/players.repo";
import {logger} from "@/server/utils/logger";

const SYNC_INTERVAL = 1000 * 60 * 60;

export async function lazySyncPlayer(
    supabase: DBClient,
    player: Player
): Promise<Result<Player>> {
    try {
        if (!needsSync(player.last_synced_at ?? null)) {
            return Ok(player);
        }

        if (!player.roblox_user_id) {
            return Ok(player);
        }

        const userResult = await getRobloxUsersById([player.roblox_user_id]);
        if (!userResult.ok || userResult.value.length === 0) {
            logger.error({robloxUserId: player.roblox_user_id, error: userResult.ok ? null : userResult.error}, "Failed to fetch Roblox user during lazy sync");
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

        const updateResult = await updatePlayer(supabase, {
            robloxUserId: String(user.id),
            username: user.name,
            displayName: user.displayName ?? null,
            avatarUrl,
            lastSyncedAt: new Date().toISOString(),
        });
        if (!updateResult.ok) {
            logger.error({robloxUserId: String(user.id), error: updateResult.error}, "Failed to update player during lazy sync");
            return updateResult;
        }
        return Ok(updateResult.value);

    } catch (err) {
        logger.error({error: err}, "Unexpected error during lazy sync");
        return Ok(player);
    }
}

export function needsSync(lastSynced: string | null) {
    if (!lastSynced) return true;

    const last = new Date(lastSynced).getTime();
    const now = Date.now();

    return now - last > SYNC_INTERVAL;
}
