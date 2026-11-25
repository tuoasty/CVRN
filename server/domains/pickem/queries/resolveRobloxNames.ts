import {DBClient} from "@/shared/types/db";
import {logger} from "@/server/utils/logger";
import {getRobloxUsersById} from "@/server/roblox/users";
import {findRobloxUserCacheRows, upsertRobloxUserCacheRows, type RobloxUserCacheRow} from "@/server/db/robloxUserCache.repo";
import type {RobloxName} from "../types";

const NAME_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ROBLOX_BATCH = 100;

const log = logger.child({module: "pickem/robloxNames"});

export async function resolveRobloxNames(supabase: DBClient, robloxUserIds: string[], now: Date = new Date()): Promise<Map<string, RobloxName>> {
    const names = new Map<string, RobloxName>();
    const ids = [...new Set(robloxUserIds)];
    if (ids.length === 0) return names;

    const cached = await findRobloxUserCacheRows(supabase, ids);
    if (!cached.ok) {
        log.warn({error: cached.error}, "Roblox name cache read failed");
        return names;
    }

    const fresh = new Set<string>();
    for (const row of cached.value) {
        names.set(row.roblox_user_id, {username: row.username, displayName: row.display_name});
        if (now.getTime() - new Date(row.fetched_at).getTime() < NAME_TTL_MS) fresh.add(row.roblox_user_id);
    }

    const stale = ids.filter(id => !fresh.has(id));
    const fetchedAt = now.toISOString();
    for (let i = 0; i < stale.length; i += ROBLOX_BATCH) {
        const batch = stale.slice(i, i + ROBLOX_BATCH);
        const users = await getRobloxUsersById(batch);
        if (!users.ok) {
            log.warn({error: users.error, count: batch.length}, "Roblox name lookup failed, showing ids");
            break;
        }
        const byId = new Map(users.value.map(u => [u.id, u]));
        const rows: RobloxUserCacheRow[] = batch.map(id => ({
            roblox_user_id: id,
            username: byId.get(id)?.name ?? null,
            display_name: byId.get(id)?.displayName ?? null,
            fetched_at: fetchedAt,
        }));
        for (const row of rows) names.set(row.roblox_user_id, {username: row.username, displayName: row.display_name});
        const saved = await upsertRobloxUserCacheRows(supabase, rows);
        if (!saved.ok) log.warn({error: saved.error}, "Roblox name cache write failed");
    }

    return names;
}
