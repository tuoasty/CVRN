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
        const {data, error} = await findTeamBySlugAndSeasonWithRegion(supabase, p);
        if (error) {
            logger.error({slug: p.slug, seasonId: p.seasonId, error}, "Failed to fetch team by slug and season");
            return Err(serializeError(error, "DB_ERROR"));
        }
        if (!data) {
            return Err({
                message: "Failed to fetch team",
                code: "DB_ERROR"
            });
        }

        return Ok(data);
    } catch (error) {
        return Err(serializeError(error));
    }
}
