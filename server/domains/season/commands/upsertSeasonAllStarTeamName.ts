import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {upsertSeasonAllStarTeamName as upsertRow} from "@/server/db/seasonHistory.repo";
import {SeasonAllStarTeam, UpsertSeasonAllStarTeamNameInput} from "../types";

export async function upsertSeasonAllStarTeamName(
    supabase: DBClient,
    p: UpsertSeasonAllStarTeamNameInput
): Promise<Result<SeasonAllStarTeam>> {
    try {
        const result = await upsertRow(supabase, {seasonId: p.seasonId, code: p.code, name: p.name});
        if (!result.ok) {
            logger.error({input: p, error: result.error}, "Failed to upsert all-star team name");
            return result;
        }
        return Ok({season_id: result.value.season_id, code: p.code, name: result.value.name});
    } catch (error) {
        logger.error({error}, "Unexpected error upserting all-star team name");
        return Err(serializeError(error));
    }
}
