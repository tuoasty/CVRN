import {getSupabaseAdmin} from "@/server/supabase/admin";
import {isValidRobloxApiSecret} from "@/server/utils/apiAuth";
import {toApiResponse} from "@/server/utils/apiResponse";
import {getOpenPickems, OpenPickemsQuerySchema} from "@/server/domains/pickem";
import {logger} from "@/server/utils/logger";
import type {DBClient} from "@/shared/types/db";

const log = logger.child({module: "api/pickems-open"});

export async function GET(req: Request) {
    if (!isValidRobloxApiSecret(req.headers.get("authorization"))) {
        log.warn({hasAuthHeader: req.headers.has("authorization")}, "Rejected: invalid or missing ROBLOX_API_SECRET");
        return new Response("Unauthorized", {status: 401});
    }

    const robloxUserId = new URL(req.url).searchParams.get("roblox_user_id");
    const parsed = OpenPickemsQuerySchema.safeParse({roblox_user_id: robloxUserId ?? undefined});
    if (!parsed.success) {
        const issues = parsed.error.issues.map(i => ({field: String(i.path[0] ?? "query"), message: i.message}));
        return Response.json({error: "Invalid request", code: "INVALID_REQUEST", issues}, {status: 400});
    }

    const result = await getOpenPickems(getSupabaseAdmin() as unknown as DBClient, parsed.data.roblox_user_id ?? null);
    if (!result.ok) {
        log.error({error: result.error}, "Open pickems read failed");
        return toApiResponse(result);
    }
    return Response.json(result.value);
}
