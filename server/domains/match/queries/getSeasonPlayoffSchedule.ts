import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchesWithDetailsBySeason} from "@/server/db/playoff.repo";
import {MatchWithDetailsRow, SeasonPlayoffSchedule} from "../types";
import {toMatchWithDetails} from "../helpers/toMatchWithDetails";
import {buildSeedMap} from "../helpers/buildSeedMap";

export async function getSeasonPlayoffSchedule(
    supabase: DBClient,
    seasonId: string
): Promise<Result<SeasonPlayoffSchedule>> {
    try {
        const result = await findMatchesWithDetailsBySeason(supabase, seasonId);
        if (!result.ok) {
            logger.error({seasonId, error: result.error}, "Failed to fetch season playoff schedule");
            return result;
        }
        const matches = result.value.map(row => ({
            ...toMatchWithDetails(row.matches as unknown as MatchWithDetailsRow),
            playoff_round: row.round,
        }));
        const seeds = buildSeedMap(result.value.map(row => ({
            seed_home: row.seed_home,
            seed_away: row.seed_away,
            home_team_id: row.matches.home_team_id,
            away_team_id: row.matches.away_team_id,
        })));
        return Ok({matches, seeds});
    } catch (error) {
        logger.error({seasonId, error}, "Unexpected error fetching season playoff schedule");
        return Err(serializeError(error));
    }
}
