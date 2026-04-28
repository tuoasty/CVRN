import {getRobloxAvatarsById, getRobloxUsersById} from "@/server/roblox/users";
import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Official} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {updateOfficial} from "@/server/db/official.repo";

const SYNC_INTERVAL = 1000 * 60 * 60;

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

        if (avatarResult.ok) {
            const avatar = avatarResult.value.find(a => a.targetId === user.id);

            if (avatar?.imageUrl) {
                avatarUrl = avatar.imageUrl;
            }
        } else {
            logger.error({userId: user.id, error: avatarResult.error}, "Failed to fetch avatar during lazy sync");
        }

        const {data, error} = await updateOfficial(supabase, {
            robloxUserId: String(user.id),
            username: user.name,
            displayName: user.displayName ?? null,
            avatarUrl,
            lastSyncedAt: new Date().toISOString(),
        });

        if (error) {
            logger.error({robloxUserId: String(user.id), error}, "Failed to update official during lazy sync");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Err({
                message: "Failed to update official",
                code: "DB_ERROR"
            });
        }

        return Ok(data);

    } catch (err) {
        logger.error({error: err}, "Unexpected error during lazy sync");
        return Ok(official);
    }
}

function needsSync(lastSynced: string | null) {
    if (!lastSynced) return true;

    const last = new Date(lastSynced).getTime();
    const now = Date.now();

    return now - last > SYNC_INTERVAL;
}
