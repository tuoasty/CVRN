import {getSupabaseAdmin} from "@/server/supabase/admin";
import {isValidRobloxApiSecret} from "@/server/utils/apiAuth";
import {AckPayoutsBodySchema, claimPickemPayouts} from "@/server/domains/pickem";
import type {PickErrorBody} from "@/server/domains/pickem";
import {logger} from "@/server/utils/logger";
import type {DBClient} from "@/shared/types/db";

const log = logger.child({module: "api/pickems-payouts-ack"});

function fail(body: PickErrorBody, status: number): Response {
    return Response.json(body, {status});
}

export async function POST(req: Request) {
    if (!isValidRobloxApiSecret(req.headers.get("authorization"))) {
        log.warn({hasAuthHeader: req.headers.has("authorization")}, "Rejected: invalid or missing ROBLOX_API_SECRET");
        return new Response("Unauthorized", {status: 401});
    }

    let json: unknown;
    try {
        json = await req.json();
    } catch {
        return fail({error: "Body must be JSON", code: "INVALID_REQUEST"}, 400);
    }

    const parsed = AckPayoutsBodySchema.safeParse(json);
    if (!parsed.success) {
        const issues = parsed.error.issues.map(i => ({field: String(i.path[0] ?? "body"), message: i.message}));
        return fail({error: "Invalid request", code: "INVALID_REQUEST", issues}, 400);
    }

    const body = parsed.data;
    const result = await claimPickemPayouts(getSupabaseAdmin() as unknown as DBClient, body);
    if (!result.ok) {
        log.error({robloxUserId: body.roblox_user_id, pickIds: body.pick_ids, error: result.error}, "Pickem payout ack failed");
        return fail({error: "Failed to record the claim", code: "DB_ERROR"}, 500);
    }

    log.info({robloxUserId: body.roblox_user_id, sent: body.pick_ids.length, claimed: result.value.claimed_pick_ids.length}, "Pickem payouts acked");
    return Response.json(result.value);
}
