import {isValidRobloxApiSecret} from "@/server/utils/apiAuth";
import {getCachedBoosterRobloxIds} from "@/server/cache/publicReads";
import {logger} from "@/server/utils/logger";
import type {BoosterListResponse} from "@/server/domains/booster";

const log = logger.child({module: "api/boosters"});

export async function GET(req: Request) {
    if (!isValidRobloxApiSecret(req.headers.get("authorization"))) {
        return new Response("Unauthorized", {status: 401});
    }

    try {
        const robloxUserIds = await getCachedBoosterRobloxIds();
        return Response.json({roblox_user_ids: robloxUserIds} satisfies BoosterListResponse);
    } catch (error) {
        log.error({error}, "Failed to read booster list");
        return Response.json({error: "Failed to read booster list", code: "DB_ERROR"}, {status: 500});
    }
}
