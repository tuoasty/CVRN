import type {DiscordBoosterRow} from "@/shared/types/db";
import type {BoosterSyncPlan, GuildBooster} from "../types";

export const RESOLVE_STALE_MS = 7 * 24 * 60 * 60 * 1000;

function sameInstant(a: string | null, b: string | null): boolean {
    if (a === null || b === null) return a === b;
    return Date.parse(a) === Date.parse(b);
}

export function planBoosterSync(
    boosters: GuildBooster[],
    existing: DiscordBoosterRow[],
    now: Date,
    staleMs: number = RESOLVE_STALE_MS,
): BoosterSyncPlan {
    const existingById = new Map(existing.map((row) => [row.discord_user_id, row]));
    const boostingIds = new Set(boosters.map((b) => b.discordUserId));

    const toDelete = existing
        .filter((row) => !boostingIds.has(row.discord_user_id))
        .map((row) => row.discord_user_id);

    const fresh: GuildBooster[] = [];
    const stale: {booster: GuildBooster; resolvedAt: number}[] = [];
    const toRefreshSince: GuildBooster[] = [];

    for (const booster of boosters) {
        const row = existingById.get(booster.discordUserId);
        if (!row || !row.resolved_at) {
            fresh.push(booster);
            continue;
        }
        const resolvedAt = Date.parse(row.resolved_at);
        if (now.getTime() - resolvedAt > staleMs) {
            stale.push({booster, resolvedAt});
            continue;
        }
        if (!sameInstant(row.premium_since, booster.premiumSince)) {
            toRefreshSince.push(booster);
        }
    }

    stale.sort((a, b) => a.resolvedAt - b.resolvedAt);

    return {
        toDelete,
        toResolve: [...fresh, ...stale.map((s) => s.booster)],
        toRefreshSince,
    };
}
