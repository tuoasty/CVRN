import {Err, Ok} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findTeamBySlugAndSeasonWithRegion} from "@/server/db/teams.repo";

export async function getTeamBySlugAndSeasonWithRegion(supabase: DBClient, p: {
    slug: string;
    seasonId: string;
}) {
    try {
        const result = await findTeamBySlugAndSeasonWithRegion(supabase, p);
        if (!result.ok) {
            logger.error({slug: p.slug, seasonId: p.seasonId, error: result.error}, "Failed to fetch team by slug and season");
            return result;
        }
        if (!result.value) {
            return Err({
                message: "Failed to fetch team",
                code: "DB_ERROR"
            });
        }
        return Ok(result.value);
    } catch (error) {
        return Err(serializeError(error));
    }
}
