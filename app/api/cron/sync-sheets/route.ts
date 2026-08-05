import { getSupabaseAdmin } from "@/server/supabase/admin";
import { findCronEnabledConfigs } from "@/server/db/sheetConfig.repo";
import { syncSheet } from "@/server/domains/sheets/commands/syncSheet";
import { revalidatePublicData, SHEET_SYNC_TAGS } from "@/server/cache/revalidate";
import { logger } from "@/server/utils/logger";
import type { DBClient } from "@/shared/types/db";

const log = logger.child({ module: "cron/sync-sheets" });

export async function GET(req: Request) {
    const auth = req.headers.get("authorization");
    if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
        log.warn("Cron request rejected: invalid or missing CRON_SECRET");
        return new Response("Unauthorized", { status: 401 });
    }

    log.info("Cron triggered: fetching cron-enabled sheet configs");

    const supabaseAdmin = getSupabaseAdmin();

    const configsResult = await findCronEnabledConfigs(supabaseAdmin as unknown as DBClient);
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

        configs.map((c) => syncSheet(supabaseAdmin as unknown as DBClient, c.id, "cron"))
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

    if (changes > 0 || failed) {
        revalidatePublicData(SHEET_SYNC_TAGS);
    } else {
        log.info("Sheet sync produced no changes; skipping revalidation");
    }

    log.info({ synced: configs.length, succeeded, changes, failed }, "Cron sync complete");

    return Response.json({ synced: configs.length, succeeded, changes });
}
