import {Ok, Result} from "@/shared/types/result";
import {DBClient, Player} from "@/shared/types/db";
import {getRobloxAvatarsById, getRobloxUsersById} from "@/server/roblox/users";
import {updatePlayersBulk, BulkPlayerUpdate} from "@/server/db/players.repo";
import {supabaseAdmin} from "@/server/supabase/admin";
import {logger} from "@/server/utils/logger";
import {needsSync} from "./lazySyncPlayer";

export async function batchSyncPlayers(
    supabase: DBClient,
    players: Player[]
): Promise<Result<Player[]>> {
    try {
        if (players.length === 0) return Ok([]);

        const stale = players.filter(
            (p): p is Player & {roblox_user_id: string} =>
                !!p.roblox_user_id && needsSync(p.last_synced_at ?? null)
        );
        if (stale.length === 0) {
            logger.debug({total: players.length}, "batchSyncPlayers: all fresh, skipping");
            return Ok(players);
        }

        const ids = Array.from(new Set(stale.map(p => p.roblox_user_id)));
        logger.info({staleCount: stale.length, idCount: ids.length}, "batchSyncPlayers: fetching from Roblox");

        const start = Date.now();
        const [usersResult, avatarsResult] = await Promise.all([
            getRobloxUsersById(ids),
            getRobloxAvatarsById(ids)
        ]);
        logger.info({elapsedMs: Date.now() - start, usersOk: usersResult.ok, avatarsOk: avatarsResult.ok}, "batchSyncPlayers: Roblox calls done");

        if (!usersResult.ok) {
            logger.error({error: usersResult.error}, "batchSyncPlayers: failed to fetch Roblox users");
            return Ok(players);
        }
        const userMap = new Map(usersResult.value.map(u => [String(u.id), u]));

        const avatarMap = new Map<string, string>();
        if (avatarsResult.ok) {
            for (const a of avatarsResult.value) {
                if (a.imageUrl) avatarMap.set(String(a.targetId), a.imageUrl);
            }
            logger.info({avatarMapSize: avatarMap.size}, "batchSyncPlayers: avatarMap built");
        } else {
            logger.error({error: avatarsResult.error}, "batchSyncPlayers: failed to fetch avatars");
        }

        const now = new Date().toISOString();
        const updates: BulkPlayerUpdate[] = [];

        for (const p of stale) {
            const key = String(p.roblox_user_id);

            const user = userMap.get(key);
            const newAvatar = avatarMap.get(key);

            if (!user) continue;

            updates.push({
                robloxUserId: p.roblox_user_id,
                username: user.name,
                displayName: user.displayName ?? null,
                avatarUrl: newAvatar ?? p.avatar_url,
                lastSyncedAt: now
            });
        }

        if (updates.length === 0) return Ok(players);

        const updateResult = await updatePlayersBulk(supabaseAdmin as unknown as DBClient, updates);
        if (!updateResult.ok) {
            logger.error({error: updateResult.error}, "batchSyncPlayers: failed to bulk update");
            return Ok(players);
        }
        logger.info({updatedCount: updateResult.value.length}, "batchSyncPlayers: bulk update committed");

        const updatedByRobloxId = new Map(updateResult.value.map(p => [p.roblox_user_id, p]));
        return Ok(players.map(p => (p.roblox_user_id && updatedByRobloxId.get(p.roblox_user_id)) || p));
    } catch (err) {
        logger.error({error: err}, "Unexpected error in batchSyncPlayers");
        return Ok(players);
    }
}
