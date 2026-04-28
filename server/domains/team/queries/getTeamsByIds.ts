import {Err, Ok, Result} from "@/shared/types/result";
import {DBClient} from "@/shared/types/db";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findTeamsByIds} from "@/server/db/teams.repo";
import {TeamWithRegion} from "../types";

export async function getTeamsByIds(
    supabase: DBClient,
    teamIds: string[]
): Promise<Result<TeamWithRegion[]>> {
    try {
        if (teamIds.length === 0) {
            return Ok([]);
        }

        const {data, error} = await findTeamsByIds(supabase, teamIds);

        if (error) {
            logger.error({teamIds, error}, "Failed to fetch teams by IDs");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch teams",
                code: "DB_ERROR"
            });
        }

        const teamsWithRegions = data.map(team => ({
            ...team,
            region: team.seasons.regions
        }));

        return Ok(teamsWithRegions as TeamWithRegion[]);
    } catch (error) {
        return Err(serializeError(error));
    }
}
