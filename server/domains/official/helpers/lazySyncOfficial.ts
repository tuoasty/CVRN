import {getRobloxAvatarsById, getRobloxUsersById} from "@/server/roblox/users";
import {Ok, Result} from "@/shared/types/result";
import {DBClient, Official} from "@/shared/types/db";
import {logger} from "@/server/utils/logger";
import {updateOfficial} from "@/server/db/official.repo";
import {supabaseAdmin} from "@/server/supabase/admin";

const SYNC_INTERVAL = 1000 * 60 * 60 * 24;

export async function lazySyncOfficial(
    supabase: DBClient,
    official: Official
): Promise<Result<Official>> {
    try {
        if (!needsSync(official.last_synced_at ?? null)) {
            return Ok(official);
        }

        if (!official.roblox_user_id) {
            return Ok(official);
        }

        const userResult = await getRobloxUsersById([official.roblox_user_id]);

        if (!userResult.ok || userResult.value.length === 0) {
            logger.error({
                robloxUserId: official.roblox_user_id,
                error: userResult.ok ? null : userResult.error
            }, "Failed to fetch Roblox user during lazy sync");
            return Ok(official);
        }

        const user = userResult.value[0];

        if (!user?.id) {
            return Ok(official);
        }

        const avatarResult = await getRobloxAvatarsById([user.id]);
        let avatarUrl: string | null = official.avatar_url;
        let avatarAcquired = false;

        if (avatarResult.ok) {
            const avatar = avatarResult.value.find(a => a.targetId === user.id);

            if (avatar?.imageUrl) {
                avatarUrl = avatar.imageUrl;
                avatarAcquired = true;
            }
        } else {
            logger.error({userId: user.id, error: avatarResult.error}, "Failed to fetch avatar during lazy sync");
        }

        const updateResult = await updateOfficial(supabaseAdmin as unknown as DBClient, {
            robloxUserId: String(user.id),
            username: user.name,
            displayName: user.displayName ?? null,
            avatarUrl,
            lastSyncedAt: avatarAcquired ? new Date().toISOString() : (official.last_synced_at ?? undefined),
        });
        if (!updateResult.ok) {
            logger.error({robloxUserId: String(user.id), error: updateResult.error}, "Failed to update official during lazy sync");
            return updateResult;
        }
        return Ok(updateResult.value);

    } catch (err) {
        logger.error({error: err}, "Unexpected error during lazy sync");
        return Ok(official);
    }
}

export function needsSync(lastSynced: string | null) {
    if (!lastSynced) return true;

    const last = new Date(lastSynced).getTime();
    const now = Date.now();

    return now - last > SYNC_INTERVAL;
}
