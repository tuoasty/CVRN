import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonAllStarTeams, findSeasonHistoryBySlugAndRegion} from "@/server/db/seasonHistory.repo";
import {findChampionGfxBySeasonId} from "@/server/db/mediaPost.repo";
import {SeasonAllStarTeam, SeasonDetail} from "../types";
import { findRegionByCode } from "@/server/db/regions.repo";

export async function getSeasonHistoryDetail(
    supabase: DBClient,
    slug: string,
    regionCode: string
): Promise<Result<SeasonDetail>> {
    try {
        const regionRes = await findRegionByCode(supabase, regionCode);
        if (!regionRes.ok) return regionRes;
        if (!regionRes.value) return Err({message: "Region not found", code: "NOT_FOUND"});

        const result = await findSeasonHistoryBySlugAndRegion(supabase, slug, regionRes.value.id);
        if (!result.ok) {
            logger.error({error: result.error, slug}, "Failed to fetch season detail");
            return result as Result<SeasonDetail>;
        }

        const season = result.value as SeasonDetail & {id: string};

        const [gfxRes, allStarRes] = await Promise.all([
            findChampionGfxBySeasonId(supabase, season.id),
            findSeasonAllStarTeams(supabase, season.id),
        ]);
        if (!gfxRes.ok) {
            logger.error({error: gfxRes.error, slug}, "Failed to fetch champion GFX for season detail");
            return gfxRes as Result<SeasonDetail>;
        }

        if (!allStarRes.ok) {
            logger.error({error: allStarRes.error, slug}, "Failed to fetch all-star teams for season detail");
            return allStarRes as Result<SeasonDetail>;
        }

        const gfx = gfxRes.value;
        return Ok({
            ...season,
            champion_gfx: gfx ? [{id: gfx.id, image_url: gfx.image_url, title: gfx.title}] : [],
            all_star_teams: allStarRes.value.map(t => ({season_id: t.season_id, code: t.code as SeasonAllStarTeam["code"], name: t.name})),
        });
    } catch (error) {
        logger.error({error, slug}, "Unexpected error fetching season detail");
        return Err(serializeError(error));
    }
}
