import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchesByTeam} from "@/server/db/matches.repo";
import {MatchWithDetails, MatchWithDetailsRow} from "../types";
import {toMatchWithDetails} from "../helpers/toMatchWithDetails";

export async function getTeamMatches(
    supabase: DBClient,
    p: {teamId: string; seasonId: string}
): Promise<Result<MatchWithDetails[]>> {
    try {
        const result = await findMatchesByTeam(supabase, p.teamId, p.seasonId);
        if (!result.ok) {
            logger.error({teamId: p.teamId, seasonId: p.seasonId, error: result.error}, "Failed to fetch team matches");
            return result;
        }
        return Ok((result.value as unknown as MatchWithDetailsRow[]).map(toMatchWithDetails));
    } catch (error) {
        logger.error({error, teamId: p.teamId, seasonId: p.seasonId}, "Unexpected error fetching team matches");
        return Err(serializeError(error));
    }
}
