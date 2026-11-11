import "server-only";
import {Ok, Result} from "@/shared/types/result";
import type {DBClient, DiscordBoosterInsert} from "@/shared/types/db";
import {deleteBoostersByDiscordIds, findAllBoosters, upsertBoosters} from "@/server/db/boosters.repo";
import {logger} from "@/server/utils/logger";
import {listGuildBoosters} from "@/server/discord/client";
import {resolveRobloxIdFromDiscord} from "../helpers/bloxlinkClient";
import {planBoosterSync} from "../helpers/planBoosterSync";
import type {BoosterSyncSummary} from "../types";

const log = logger.child({module: "booster/sync"});

export const DEFAULT_MAX_RESOLVES = 40;
const DEFAULT_SPACING_MS = 1100;

interface SyncBoostersOptions {
    maxResolves?: number;
    spacingMs?: number;
    now?: Date;
    sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function robloxIdSet(entries: Iterable<string | null>): Set<string> {
    const ids = new Set<string>();
    for (const id of entries) if (id) ids.add(id);
    return ids;
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const id of a) if (!b.has(id)) return false;
    return true;
}

export async function syncBoosters(
    supabase: DBClient,
    options: SyncBoostersOptions = {},
): Promise<Result<BoosterSyncSummary>> {
    const maxResolves = options.maxResolves ?? DEFAULT_MAX_RESOLVES;
    const spacingMs = options.spacingMs ?? DEFAULT_SPACING_MS;
    const now = options.now ?? new Date();
    const sleep = options.sleep ?? defaultSleep;
    const nowIso = now.toISOString();

    const listed = await listGuildBoosters();
    if (!listed.ok) return listed;

    const existingRes = await findAllBoosters(supabase);
    if (!existingRes.ok) return existingRes;
    const existing = existingRes.value;
    const existingById = new Map(existing.map((row) => [row.discord_user_id, row]));

    const plan = planBoosterSync(listed.value, existing, now);

    const rows: DiscordBoosterInsert[] = [];
    let attempts = 0;
    let resolved = 0;
    let unlinked = 0;
    let added = 0;
    let deferred = 0;
    let stopped = false;

    for (const booster of plan.toResolve) {
        if (stopped || attempts >= maxResolves) {
            deferred++;
            continue;
        }
        if (attempts > 0) await sleep(spacingMs);
        attempts++;

        const lookup = await resolveRobloxIdFromDiscord(booster.discordUserId);
        if (!lookup.ok) {
            stopped = true;
            deferred++;
            continue;
        }

        resolved++;
        if (lookup.value === null) unlinked++;
        if (!existingById.has(booster.discordUserId)) added++;
        rows.push({
            discord_user_id: booster.discordUserId,
            roblox_user_id: lookup.value,
            premium_since: booster.premiumSince,
            resolved_at: nowIso,
            updated_at: nowIso,
        });
    }

    for (const booster of plan.toRefreshSince) {
        const row = existingById.get(booster.discordUserId);
        if (!row) continue;
        rows.push({...row, premium_since: booster.premiumSince, updated_at: nowIso});
    }

    const deleted = await deleteBoostersByDiscordIds(supabase, plan.toDelete);
    if (!deleted.ok) return deleted;

    const upserted = await upsertBoosters(supabase, rows);
    if (!upserted.ok) return upserted;

    const after = new Map(existing.map((row) => [row.discord_user_id, row.roblox_user_id]));
    for (const id of plan.toDelete) after.delete(id);
    for (const row of rows) after.set(row.discord_user_id, row.roblox_user_id ?? null);

    const changed = !sameSet(
        robloxIdSet(existing.map((row) => row.roblox_user_id)),
        robloxIdSet(after.values()),
    );

    const summary: BoosterSyncSummary = {
        boosters: listed.value.length,
        added,
        removed: plan.toDelete.length,
        resolved,
        unlinked,
        deferred,
        changed,
    };
    log.info(summary, stopped ? "Booster sync stopped early on a Bloxlink error" : "Booster sync complete");
    return Ok(summary);
}
