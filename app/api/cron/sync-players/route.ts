import { supabaseAdmin } from "@/server/supabase/admin";
import { batchSyncPlayers } from "@/server/domains/player/helpers/batchSyncPlayers";
import { revalidatePublicData } from "@/server/cache/revalidate";
import { CACHE_TAGS } from "@/server/cache/tags";
import { logger } from "@/server/utils/logger";
import type { DBClient, Player } from "@/shared/types/db";

const log = logger.child({ module: "cron/sync-players" });

/**
 * Roblox's thumbnails endpoint accepts at most 100 ids per call, and the client in
 * server/roblox/users.ts sends whatever it is given in a single request — it does no
 * chunking of its own. Anything above this fails the whole batch.
 */
const ROBLOX_BATCH_SIZE = 100;

/** PostgREST `in.(...)` lives in the URL, so ids have to be requested in chunks. */
const ID_QUERY_CHUNK = 200;

/**
 * Players refreshed per run, after filtering to current rosters and sorting by staleness.
 *
 * ~1200 players sit on active rosters and `needsSync` only lets through profiles older
 * than SYNC_INTERVAL, so this ceiling is mostly a timeout guard rather than a real limit.
 */
const DEFAULT_LIMIT = 400;

/**
 * Refresh Roblox profiles for players on active rosters.
 *
 * Scoped deliberately. Roughly half of the ~2400 player rows are historical — they left,
 * or their season ended — and only ever render on archive pages. Syncing the whole table
 * would double the outbound Roblox traffic to keep avatars current on pages nobody opens.
 */
export async function GET(req: Request) {
    const auth = req.headers.get("authorization");
    if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
        log.warn("Cron request rejected: invalid or missing CRON_SECRET");
        return new Response("Unauthorized", { status: 401 });
    }

    const limit = Number(new URL(req.url).searchParams.get("limit")) || DEFAULT_LIMIT;
    const nowIso = new Date().toISOString();

    const { data: seasons, error: seasonError } = await supabaseAdmin
        .from("seasons")
        .select("id")
        .or(`end_date.is.null,end_date.gt.${nowIso}`);

    if (seasonError) {
        log.error({ error: seasonError }, "Failed to fetch active seasons");
        return new Response("Failed to fetch active seasons", { status: 500 });
    }

    const seasonIds = (seasons ?? []).map((s) => s.id);
    if (seasonIds.length === 0) {
        log.info("No active seasons; nothing to sync");
        return Response.json({ scanned: 0, synced: 0, batches: 0 });
    }

    const { data: roster, error: rosterError } = await supabaseAdmin
        .from("player_team_seasons")
        .select("player_id")
        .in("season_id", seasonIds)
        .is("left_at", null);

    if (rosterError) {
        log.error({ error: rosterError }, "Failed to fetch active rosters");
        return new Response("Failed to fetch rosters", { status: 500 });
    }

    // A player on two active-season rosters appears twice.
    const playerIds = [...new Set((roster ?? []).map((r) => r.player_id).filter(Boolean))] as string[];
    if (playerIds.length === 0) {
        log.info("No rostered players; nothing to sync");
        return Response.json({ scanned: 0, synced: 0, batches: 0 });
    }

    const players: Player[] = [];
    for (let i = 0; i < playerIds.length; i += ID_QUERY_CHUNK) {
        const { data, error } = await supabaseAdmin
            .from("players")
            .select("*")
            .in("id", playerIds.slice(i, i + ID_QUERY_CHUNK))
            .not("roblox_user_id", "is", null);

        if (error) {
            log.error({ error, offset: i }, "Failed to fetch player chunk");
            return new Response("Failed to fetch players", { status: 500 });
        }
        players.push(...((data ?? []) as unknown as Player[]));
    }

    // Stalest first: never-synced players still show placeholder avatars, so they lead.
    players.sort((a, b) => {
        if (!a.last_synced_at) return -1;
        if (!b.last_synced_at) return 1;
        return a.last_synced_at.localeCompare(b.last_synced_at);
    });

    const target = players.slice(0, limit);

    // Sequential, not parallel: the Roblox client sits behind a circuit breaker that trips
    // after 5 failures, and firing every chunk at once is the fastest way to trip it.
    // batchSyncPlayers drops anything already fresh, so most runs do far less than this.
    let batches = 0;
    for (let i = 0; i < target.length; i += ROBLOX_BATCH_SIZE) {
        const result = await batchSyncPlayers(
            supabaseAdmin as unknown as DBClient,
            target.slice(i, i + ROBLOX_BATCH_SIZE),
        );
        if (!result.ok) {
            log.error({ error: result.error, offset: i }, "Player batch sync failed");
        }
        batches++;
    }

    revalidatePublicData([CACHE_TAGS.players, CACHE_TAGS.teams]);

    log.info(
        { rostered: playerIds.length, candidates: players.length, attempted: target.length, batches },
        "Player sync complete",
    );
    return Response.json({ rostered: playerIds.length, attempted: target.length, batches });
}
