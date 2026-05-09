import { supabaseAdmin } from "@/server/supabase/admin";
import { findCronEnabledConfigs } from "@/server/db/sheetConfig.repo";
import { syncSheet } from "@/server/domains/sheets/commands/syncSheet";
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

    results.forEach((result, i) => {
        const configId = configs[i].id;
        if (result.status === "fulfilled") {
            if (result.value.ok) {
                log.info({ configId }, "Sheet sync succeeded");
            } else {
                log.error({ configId, error: result.value.error }, "Sheet sync returned error");
            }
        } else {
            log.error({ configId, reason: result.reason }, "Sheet sync threw exception");
        }
    });

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    log.info({ synced: configs.length, succeeded }, "Cron sync complete");

    return Response.json({ synced: configs.length, succeeded });
}
