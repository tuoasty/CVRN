import {createPublicClient} from "@/server/supabase/server-public";
import {isValidRobloxApiSecret} from "@/server/utils/apiAuth";
import {toApiResponse} from "@/server/utils/apiResponse";
import {RobloxIdParamSchema, SeasonQuerySchema} from "@/server/domains/player";
import {resolveSeasonNumber} from "@/server/domains/season";
import {getCachedBoosterRobloxIds, getCachedPlayerDetailByRobloxId} from "@/server/cache/publicReads";
import {logger} from "@/server/utils/logger";

const log = logger.child({module: "api/player-details"});

async function isBooster(robloxUserId: string): Promise<boolean> {
    try {
        const ids = await getCachedBoosterRobloxIds();
        return ids.includes(robloxUserId);
    } catch (error) {
        log.error({error}, "Booster lookup failed; reporting is_booster false");
        return false;
    }
}

export async function GET(req: Request, {params}: {params: Promise<{robloxId: string}>}) {
    const startedAt = Date.now();
    const url = new URL(req.url);

    if (!isValidRobloxApiSecret(req.headers.get("authorization"))) {
        log.warn({path: url.pathname, hasAuthHeader: req.headers.has("authorization")}, "Rejected: invalid or missing ROBLOX_API_SECRET");
        return new Response("Unauthorized", {status: 401});
    }

    const {robloxId} = await params;
    const seasonParam = url.searchParams.get("season");
    log.info({robloxId, seasonParam, query: url.search}, "Player detail request");

    const parsedId = RobloxIdParamSchema.safeParse({robloxId});
    const parsedSeason = SeasonQuerySchema.safeParse(seasonParam);
    if (!parsedId.success || !parsedSeason.success) {
        const issues = [
            ...(parsedId.success ? [] : parsedId.error.issues.map((i) => ({field: "robloxId", input: robloxId, message: i.message}))),
            ...(parsedSeason.success ? [] : parsedSeason.error.issues.map((i) => ({field: "season", input: seasonParam, message: i.message}))),
        ];
        log.warn({robloxId, seasonParam, issues}, "Validation failed");
        return Response.json({error: "Invalid request", code: "VALIDATION_ERROR", issues}, {status: 400});
    }

    let seasonNumber: number | null = null;
    if (parsedSeason.data !== "all") {
        const supabase = createPublicClient();
        const resolved = await resolveSeasonNumber(supabase, parsedSeason.data);
        if (!resolved.ok) {
            log.warn({robloxId, season: parsedSeason.data, error: resolved.error}, "Season resolution failed");
            return toApiResponse(resolved);
        }
        seasonNumber = resolved.value;
    }

    const [result, booster] = await Promise.all([
        getCachedPlayerDetailByRobloxId(parsedId.data.robloxId, seasonNumber),
        isBooster(parsedId.data.robloxId),
    ]);
    if (!result.ok) {
        log.warn({robloxId, seasonNumber, code: result.error.code, message: result.error.message, ms: Date.now() - startedAt}, "Player detail lookup failed");
        return toApiResponse(result);
    }

    log.info({
        robloxId,
        seasonNumber,
        isBooster: booster,
        achievements: result.value.achievements.length,
        awards: result.value.awards.length,
        specAwards: result.value.spec_awards.length,
        ms: Date.now() - startedAt,
    }, "Player detail served");
    return Response.json({...result.value, is_booster: booster});
}
