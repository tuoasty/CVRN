import {createPublicClient} from "@/server/supabase/server-public";
import {isValidRobloxApiSecret} from "@/server/utils/apiAuth";
import {toApiResponse} from "@/server/utils/apiResponse";
import {SeasonNumberQuerySchema, resolveSeasonNumber, getChampionArchivesBySeasonNumber} from "@/server/domains/season";

export async function GET(req: Request) {
    if (!isValidRobloxApiSecret(req.headers.get("authorization"))) {
        return new Response("Unauthorized", {status: 401});
    }

    const parsed = SeasonNumberQuerySchema.safeParse({
        season: new URL(req.url).searchParams.get("season"),
    });
    if (!parsed.success) {
        return Response.json({error: "Invalid season", code: "VALIDATION_ERROR"}, {status: 400});
    }

    const supabase = createPublicClient();

    const resolved = await resolveSeasonNumber(supabase, parsed.data.season);
    if (!resolved.ok) return toApiResponse(resolved);

    const result = await getChampionArchivesBySeasonNumber(supabase, resolved.value);
    return toApiResponse(result);
}
