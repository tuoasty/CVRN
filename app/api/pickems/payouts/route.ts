import {getSupabaseAdmin} from "@/server/supabase/admin";
import {isValidRobloxApiSecret} from "@/server/utils/apiAuth";
import {getPickemPayouts, PayoutsQuerySchema} from "@/server/domains/pickem";
import type {PickErrorBody} from "@/server/domains/pickem";
import {logger} from "@/server/utils/logger";
import type {DBClient} from "@/shared/types/db";

const log = logger.child({module: "api/pickems-payouts"});

export async function GET(req: Request) {
    if (!isValidRobloxApiSecret(req.headers.get("authorization"))) {
        log.warn({hasAuthHeader: req.headers.has("authorization")}, "Rejected: invalid or missing ROBLOX_API_SECRET");
        return new Response("Unauthorized", {status: 401});
    }

    const robloxUserId = new URL(req.url).searchParams.get("roblox_user_id");
    const parsed = PayoutsQuerySchema.safeParse({roblox_user_id: robloxUserId ?? undefined});
    if (!parsed.success) {
        const issues = parsed.error.issues.map(i => ({field: String(i.path[0] ?? "query"), message: i.message}));
        return Response.json({error: "Invalid request", code: "INVALID_REQUEST", issues} satisfies PickErrorBody, {status: 400});
    }

    const result = await getPickemPayouts(getSupabaseAdmin() as unknown as DBClient, parsed.data.roblox_user_id);
    if (!result.ok) {
        log.error({robloxUserId: parsed.data.roblox_user_id, error: result.error}, "Pickem payouts read failed");
        return Response.json({error: "Failed to read payouts", code: "DB_ERROR"} satisfies PickErrorBody, {status: 500});
    }
    return Response.json(result.value);
}
