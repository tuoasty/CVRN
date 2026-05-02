import {Ok, Result} from "@/shared/types/result";
import {DBClient, Official} from "@/shared/types/db";
import {getRobloxAvatarsById, getRobloxUsersById} from "@/server/roblox/users";
import {updateOfficialsBulk, BulkOfficialUpdate} from "@/server/db/official.repo";
import {supabaseAdmin} from "@/server/supabase/admin";
import {logger} from "@/server/utils/logger";
import {needsSync} from "./lazySyncOfficial";

export async function batchSyncOfficials(
    supabase: DBClient,
    officials: Official[]
): Promise<Result<Official[]>> {
    try {
        if (officials.length === 0) return Ok([]);

        const stale = officials.filter(
            (o): o is Official & {roblox_user_id: string} =>
                !!o.roblox_user_id && needsSync(o.last_synced_at ?? null)
        );
        if (stale.length === 0) {
            logger.debug({total: officials.length}, "batchSyncOfficials: all fresh, skipping");
            return Ok(officials);
        }

        const ids = Array.from(new Set(stale.map(o => o.roblox_user_id)));
        logger.info({staleCount: stale.length, idCount: ids.length}, "batchSyncOfficials: fetching from Roblox");

        const start = Date.now();
        const [usersResult, avatarsResult] = await Promise.all([
            getRobloxUsersById(ids),
            getRobloxAvatarsById(ids)
        ]);
        logger.info({elapsedMs: Date.now() - start, usersOk: usersResult.ok, avatarsOk: avatarsResult.ok}, "batchSyncOfficials: Roblox calls done");

        if (!usersResult.ok) {
            logger.error({error: usersResult.error}, "batchSyncOfficials: failed to fetch Roblox users");
            return Ok(officials);
        }
        const userMap = new Map(usersResult.value.map(u => [u.id, u]));

        const avatarMap = new Map<string, string>();
        if (avatarsResult.ok) {
            for (const a of avatarsResult.value) {
                if (a.imageUrl) avatarMap.set(a.targetId, a.imageUrl);
            }
        } else {
            logger.error({error: avatarsResult.error}, "batchSyncOfficials: failed to fetch avatars");
        }

        const now = new Date().toISOString();
        const updates: BulkOfficialUpdate[] = [];
        for (const o of stale) {
            const user = userMap.get(o.roblox_user_id);
            if (!user) continue;
            const newAvatar = avatarMap.get(o.roblox_user_id);
            const fullySynced = !!newAvatar;
            updates.push({
                robloxUserId: o.roblox_user_id,
                username: user.name,
                displayName: user.displayName ?? null,
                avatarUrl: newAvatar ?? o.avatar_url,
                lastSyncedAt: fullySynced ? now : undefined
            });
        }

        if (updates.length === 0) return Ok(officials);

        const updateResult = await updateOfficialsBulk(supabaseAdmin as unknown as DBClient, updates);
        if (!updateResult.ok) {
            logger.error({error: updateResult.error}, "batchSyncOfficials: failed to bulk update");
            return Ok(officials);
        }
        logger.info({updatedCount: updateResult.value.length}, "batchSyncOfficials: bulk update committed");

        const updatedByRobloxId = new Map(updateResult.value.map(o => [o.roblox_user_id, o]));
        return Ok(officials.map(o => (o.roblox_user_id && updatedByRobloxId.get(o.roblox_user_id)) || o));
    } catch (err) {
        logger.error({error: err}, "Unexpected error in batchSyncOfficials");
        return Ok(officials);
    }
}
