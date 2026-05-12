import {supabaseAdmin} from "@/server/supabase/admin";
import {getRobloxFullAvatarsById} from "@/server/roblox/users";
import {logger} from "@/server/utils/logger";

const SYNC_INTERVAL_MS = 1000 * 60 * 60 * 24; // 24 hours

export function needsAvatarSync(syncedAt: string | null): boolean {
    if (!syncedAt) return true;
    return Date.now() - new Date(syncedAt).getTime() > SYNC_INTERVAL_MS;
}

function extractRobloxId(players: unknown): string | null {
    const player = Array.isArray(players)
        ? (players as {roblox_user_id: unknown}[])[0]
        : (players as {roblox_user_id: unknown} | null);
    return typeof player?.roblox_user_id === "string" ? player.roblox_user_id : null;
}

export async function syncAwardAvatars(seasonId: string): Promise<void> {
    const {data, error} = await supabaseAdmin
        .from("season_awards")
        .select("id, full_avatar_synced_at, players(roblox_user_id)")
        .eq("season_id", seasonId);

    if (error) {
        logger.error({error, seasonId}, "syncAwardAvatars: failed to query awards");
        return;
    }

    const pending = (data ?? [])
        .map(a => ({...a, robloxId: extractRobloxId(a.players)}))
        .filter((a): a is typeof a & {robloxId: string} =>
            a.robloxId !== null && needsAvatarSync(a.full_avatar_synced_at ?? null)
        );

    if (pending.length === 0) return;

    const ids = [...new Set(pending.map(a => a.robloxId))];
    const avatarResult = await getRobloxFullAvatarsById(ids);

    if (!avatarResult.ok) {
        logger.error({error: avatarResult.error, seasonId}, "syncAwardAvatars: Roblox call failed");
        return;
    }

    const avatarMap = new Map(
        avatarResult.value
            .filter(a => a.imageUrl)
            .map(a => [String(a.targetId), a.imageUrl])
    );

    await Promise.all(
        pending.map(async (award) => {
            const url = avatarMap.get(award.robloxId);
            if (!url) return;

            const {error: updateError} = await supabaseAdmin
                .from("season_awards")
                .update({full_avatar_url: url, full_avatar_synced_at: new Date().toISOString()})
                .eq("id", award.id);

            if (updateError) {
                logger.error({error: updateError, awardId: award.id}, "syncAwardAvatars: failed to update award");
            }
        })
    );

    logger.info({seasonId, count: pending.length}, "syncAwardAvatars: completed");
}
