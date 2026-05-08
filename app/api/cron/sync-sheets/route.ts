import { supabaseAdmin } from "@/server/supabase/admin";
import { findCronEnabledConfigs } from "@/server/db/sheetConfig.repo";
import { syncSheet } from "@/server/domains/sheets/commands/syncSheet";

export async function POST(req: Request) {
    const auth = req.headers.get("authorization");
    if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const configsResult = await findCronEnabledConfigs(supabaseAdmin as any);
    if (!configsResult.ok) {
        return new Response("Failed to fetch configs", { status: 500 });
    }

    const configs = configsResult.value;
    if (configs.length === 0) {
        return Response.json({ synced: 0, message: "No cron-enabled configs" });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Promise.allSettled(configs.map((c) => syncSheet(supabaseAdmin as any, c.id, "cron")));

    return Response.json({ synced: configs.length });
}
