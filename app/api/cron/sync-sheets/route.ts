import { supabaseAdmin } from "@/server/supabase/admin";
import { findCronEnabledConfigs } from "@/server/db/sheetConfig.repo";
import { syncSheet } from "@/server/domains/sheets/commands/syncSheet";
import { revalidatePublicData, SHEET_SYNC_TAGS } from "@/server/cache/revalidate";
import { logger } from "@/server/utils/logger";

const log = logger.child({ module: "cron/sync-sheets" });

export async function GET(req: Request) {
    const auth = req.headers.get("authorization");
    if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
        log.warn("Cron request rejected: invalid or missing CRON_SECRET");
        return new Response("Unauthorized", { status: 401 });
    }

    log.info("Cron triggered: fetching cron-enabled sheet configs");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configsResult = await findCronEnabledConfigs(supabaseAdmin as any);
    if (!configsResult.ok) {
        log.error({ error: configsResult.error }, "Failed to fetch cron-enabled configs");
        return new Response("Failed to fetch configs", { status: 500 });
    }

    const configs = configsResult.value;
    if (configs.length === 0) {
        log.info("No cron-enabled configs found, skipping sync");
        return Response.json({ synced: 0, message: "No cron-enabled configs" });
    }

    log.info({ count: configs.length }, "Starting sync for cron-enabled configs");

    const results = await Promise.allSettled(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        configs.map((c) => syncSheet(supabaseAdmin as any, c.id, "cron"))
    );

    let changes = 0;
    let failed = false;

    results.forEach((result, i) => {
        const configId = configs[i].id;
        if (result.status === "fulfilled") {
            if (result.value.ok) {
                changes += result.value.value.changes.length;
                log.info({ configId, changes: result.value.value.changes.length }, "Sheet sync succeeded");
            } else {
                failed = true;
                log.error({ configId, error: result.value.error }, "Sheet sync returned error");
            }
        } else {
            failed = true;
            log.error({ configId, reason: result.reason }, "Sheet sync threw exception");
        }
    });

    const succeeded = results.filter((r) => r.status === "fulfilled").length;

    // Public pages cache until a tag purge, so without this the site would not reflect the
    // sync at all. Gated on the sync actually having changed something: SHEET_SYNC_TAGS is
    // five of the eight tags and re-renders nearly every cached page, which is a large bill
    // for a night where the sheet was untouched.
    //
    // A failed or throwing config still invalidates. It may have committed some rows before
    // dying, and serving a stale page is worse than paying for one extra re-render.
    if (changes > 0 || failed) {
        revalidatePublicData(SHEET_SYNC_TAGS);
    } else {
        log.info("Sheet sync produced no changes; skipping revalidation");
    }

    log.info({ synced: configs.length, succeeded, changes, failed }, "Cron sync complete");

    return Response.json({ synced: configs.length, succeeded, changes });
}
