import {getSupabaseAdmin} from "@/server/supabase/admin";
import {isValidRobloxApiSecret} from "@/server/utils/apiAuth";
import {placePickemPick, PlacePickBodySchema} from "@/server/domains/pickem";
import type {PickErrorBody, PickErrorCode} from "@/server/domains/pickem";
import {logger} from "@/server/utils/logger";
import type {DBClient} from "@/shared/types/db";

const log = logger.child({module: "api/pickems-picks"});

const STATUS_BY_CODE: Record<PickErrorCode | "DB_ERROR", number> = {
    INVALID_REQUEST: 400,
    OUTCOME_NOT_FOUND: 400,
    STAKE_OUT_OF_RANGE: 400,
    MARKET_NOT_FOUND: 404,
    MARKET_LOCKED: 409,
    STAKE_LOWERED: 409,
    DB_ERROR: 500,
};

function fail(body: PickErrorBody): Response {
    return Response.json(body, {status: STATUS_BY_CODE[body.code]});
}

export async function PUT(req: Request) {
    if (!isValidRobloxApiSecret(req.headers.get("authorization"))) {
        log.warn({hasAuthHeader: req.headers.has("authorization")}, "Rejected: invalid or missing ROBLOX_API_SECRET");
        return new Response("Unauthorized", {status: 401});
    }

    let json: unknown;
    try {
        json = await req.json();
    } catch {
        return fail({error: "Body must be JSON", code: "INVALID_REQUEST"});
    }

    const parsed = PlacePickBodySchema.safeParse(json);
    if (!parsed.success) {
        const issues = parsed.error.issues.map(i => ({field: String(i.path[0] ?? "body"), message: i.message}));
        return fail({error: "Invalid request", code: "INVALID_REQUEST", issues});
    }

    const body = parsed.data;
    const result = await placePickemPick(getSupabaseAdmin() as unknown as DBClient, body);
    if (!result.ok) {
        const level = result.error.code === "DB_ERROR" ? "error" : "info";
        log[level]({robloxUserId: body.roblox_user_id, marketId: body.market_id, stake: body.stake, code: result.error.code}, "Pick rejected");
        return fail({error: result.error.message, code: result.error.code});
    }

    log.info({
        robloxUserId: body.roblox_user_id,
        marketId: body.market_id,
        outcome: result.value.pick.outcome,
        stake: result.value.pick.stake,
        charged: result.value.charged,
        replayed: result.value.replayed,
    }, "Pick placed");
    return Response.json(result.value);
}
