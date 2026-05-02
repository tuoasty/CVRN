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
        logger.info({
            sampleUserMapKey: usersResult.value[0]?.id,
            sampleUserMapKeyType: typeof usersResult.value[0]?.id,
            samplePlayerId: stale[0]?.roblox_user_id,
            samplePlayerIdType: typeof stale[0]?.roblox_user_id,
            userMapSize: userMap.size,
            staleCount: stale.length
        }, "batchSyncPlayers: type check");

        const avatarMap = new Map<string, string>();
        if (avatarsResult.ok) {
            logger.info({
                avatarCount: avatarsResult.value.length,
                sampleTargetId: avatarsResult.value[0]?.targetId,
                sampleTargetIdType: typeof avatarsResult.value[0]?.targetId,
                sampleState: avatarsResult.value[0]?.state,
                sampleImageUrl: avatarsResult.value[0]?.imageUrl,
                allAvatars: avatarsResult.value.map(a => ({targetId: a.targetId, state: a.state, imageUrl: a.imageUrl}))
            }, "batchSyncPlayers: avatar response");
            for (const a of avatarsResult.value) {
                if (a.imageUrl) avatarMap.set(String(a.targetId), a.imageUrl);
            }
            logger.info({avatarMapSize: avatarMap.size}, "batchSyncPlayers: avatarMap built");
        } else {
            logger.error({error: avatarsResult.error}, "batchSyncPlayers: failed to fetch avatars");
        }

        logger.info({
            sampleAvatarKey: Array.from(avatarMap.keys())[0],
            sampleAvatarKeyType: typeof Array.from(avatarMap.keys())[0],
            samplePlayerId: stale[0]?.roblox_user_id,
            samplePlayerIdType: typeof stale[0]?.roblox_user_id
        }, "avatarMap type check");

        const now = new Date().toISOString();
        const updates: BulkPlayerUpdate[] = [];

        for (const p of stale) {
            const key = String(p.roblox_user_id);

            const user = userMap.get(key);
            const newAvatar = avatarMap.get(key);

            logger.debug({
                lookupKey: key,
                lookupKeyType: typeof p.roblox_user_id,
                userFound: !!user,
                avatarFound: !!newAvatar,
                sampleUserMapKeys: Array.from(userMap.keys()).slice(0, 5),
                userMapSize: userMap.size
            }, "batchSyncPlayers: lookup check");

            if (!user) {
                logger.warn({
                    missingKey: key,
                    availableKeysSample: Array.from(userMap.keys()).slice(0, 10)
                }, "batchSyncPlayers: user not found in userMap");
                continue;
            }

            const fullySynced = !!newAvatar;

            updates.push({
                robloxUserId: p.roblox_user_id,
                username: user.name,
                displayName: user.displayName ?? null,
                avatarUrl: newAvatar ?? p.avatar_url,
                lastSyncedAt: fullySynced ? now : undefined
            });
        }

        logger.debug({ updatesLength: updates.length }, "batchSyncPlayers: updates built");
        logger.debug({updates:updates}, "Updating players in bulk")
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
