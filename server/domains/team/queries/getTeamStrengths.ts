import {DBClient} from "@/shared/types/db";
import {Err, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findTeamStrengthRatings} from "@/server/db/teamStrength.repo";
import {TeamStrength} from "../types";

export async function getTeamStrengths(supabase: DBClient, p: {seasonNumber: number}): Promise<Result<TeamStrength[]>> {
    try {
        const rows = await findTeamStrengthRatings(supabase, p.seasonNumber);
        if (!rows.ok) {
            logger.error({seasonNumber: p.seasonNumber, error: rows.error}, "Failed to fetch team strength ratings");
        }
        return rows;
    } catch (error) {
        logger.error({error, seasonNumber: p.seasonNumber}, "Unexpected error fetching team strength ratings");
        return Err(serializeError(error));
    }
}
