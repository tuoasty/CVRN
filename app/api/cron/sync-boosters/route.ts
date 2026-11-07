import {isValidBearerSecret} from "@/server/utils/apiAuth";
import {toApiResponse} from "@/server/utils/apiResponse";
import {listGuildBoosters} from "@/server/domains/booster";
import {logger} from "@/server/utils/logger";

const log = logger.child({module: "cron/sync-boosters"});

export async function GET(req: Request) {
    if (!isValidBearerSecret(req.headers.get("authorization"), process.env.CRON_SECRET)) {
        log.warn("Cron request rejected: invalid or missing CRON_SECRET");
        return new Response("Unauthorized", {status: 401});
    }

    const result = await listGuildBoosters();
    if (!result.ok) return toApiResponse(result);

    return Response.json({
        count: result.value.length,
        boosters: result.value,
    });
}
