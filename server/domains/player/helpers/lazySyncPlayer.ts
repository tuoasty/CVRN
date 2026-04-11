import {getRobloxAvatarsById, getRobloxUserByName} from "@/server/roblox/users";
import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient, Player} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
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

        if (!player.username) {
            return Ok(player);
        }

        const userResult = await getRobloxUserByName(player.username);
        if (!userResult.ok || userResult.value.length === 0) {
            logger.error({username: player.username, error: userResult.ok ? null : userResult.error}, "Failed to fetch Roblox user during lazy sync");
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

        const {data, error} = await updatePlayer(supabase, {
            robloxUserId: String(user.id),
            username: user.name,
            displayName: user.displayName ?? null,
            avatarUrl,
            lastSyncedAt: new Date().toISOString(),
        });

        if (error) {
            logger.error({robloxUserId: String(user.id), error}, "Failed to update player during lazy sync");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "UpdateError",
                message: "Failed to update player"
            });
        }

        return Ok(data);

    } catch (err) {
        logger.error({error: err}, "Unexpected error during lazy sync");
        return Err(serializeError(err));
    }
}

export function needsSync(lastSynced: string | null) {
    if (!lastSynced) return true;

    const last = new Date(lastSynced).getTime();
    const now = Date.now();

    return now - last > SYNC_INTERVAL;
}
