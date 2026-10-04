import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonAllStarTeams} from "@/server/db/seasonHistory.repo";
import {SeasonAllStarTeam} from "../types";

export async function getSeasonAllStarTeams(
    supabase: DBClient,
    seasonId: string
): Promise<Result<SeasonAllStarTeam[]>> {
    try {
        const result = await findSeasonAllStarTeams(supabase, seasonId);
        if (!result.ok) {
            logger.error({seasonId, error: result.error}, "Failed to fetch season all-star teams");
            return result;
        }
        return Ok(result.value.map(r => ({season_id: r.season_id, code: r.code as SeasonAllStarTeam["code"], name: r.name})));
    } catch (error) {
        logger.error({error}, "Unexpected error fetching season all-star teams");
        return Err(serializeError(error));
    }
}
