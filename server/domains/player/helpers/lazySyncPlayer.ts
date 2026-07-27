import {getRobloxAvatarsById, getRobloxUsersById} from "@/server/roblox/users";
import {Ok, Result} from "@/shared/types/result";
import {DBClient, Player} from "@/shared/types/db";
import {updatePlayer} from "@/server/db/players.repo";
import {getSupabaseAdmin} from "@/server/supabase/admin";
import {logger} from "@/server/utils/logger";

/**
 * How long a Roblox profile stays fresh before the sync-players cron will refresh it.
 *
 * Was 24h, which meant every rostered player went stale every single day — roughly 1200
 * outbound Roblox calls daily to catch the occasional username or avatar change. Usernames
 * and avatars change rarely, so a week is ample and cuts the traffic by ~7x.
 *
 * This does not delay new players: `needsSync` treats a null `last_synced_at` as stale, so
 * a freshly added player still syncs immediately on the admin write path.
 */
const SYNC_INTERVAL = 1000 * 60 * 60 * 24 * 7;

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
        let avatarAcquired = false;
        if (avatarResult.ok) {
            const avatar = avatarResult.value.find(
                a => a.targetId === user.id
            );

            if (avatar?.imageUrl) {
                avatarUrl = avatar.imageUrl;
                avatarAcquired = true;
            }
        } else {
            logger.error({userId: user.id, error: avatarResult.error}, "Failed to fetch avatar during lazy sync");
        }

        const updateResult = await updatePlayer(getSupabaseAdmin() as unknown as DBClient, {
            robloxUserId: String(user.id),
            username: user.name,
            displayName: user.displayName ?? null,
            avatarUrl,
            lastSyncedAt: avatarAcquired ? new Date().toISOString() : (player.last_synced_at ?? undefined),
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
