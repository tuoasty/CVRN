import {createPublicClient} from "@/server/supabase/server-public";
import {isValidRobloxApiSecret} from "@/server/utils/apiAuth";
import {toApiResponse} from "@/server/utils/apiResponse";
import {SeasonQuerySchema, getRawStatSummaryBySeasonNumber} from "@/server/domains/player";
import {resolveSeasonNumber} from "@/server/domains/season";

export async function GET(req: Request) {
    if (!isValidRobloxApiSecret(req.headers.get("authorization"))) {
        return new Response("Unauthorized", {status: 401});
    }

    const seasonParam = new URL(req.url).searchParams.get("season");
    const parsedSeason = SeasonQuerySchema.safeParse(seasonParam);
    if (!parsedSeason.success) {
        return Response.json({error: "Invalid request", code: "VALIDATION_ERROR"}, {status: 400});
    }

    const supabase = createPublicClient();

    let seasonNumber: number | null = null;
    if (parsedSeason.data !== "all") {
        const resolved = await resolveSeasonNumber(supabase, parsedSeason.data);
        if (!resolved.ok) return toApiResponse(resolved);
        seasonNumber = resolved.value;
    }

    const result = await getRawStatSummaryBySeasonNumber(supabase, seasonNumber);
    return toApiResponse(result);
}
