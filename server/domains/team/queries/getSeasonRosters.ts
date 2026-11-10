import {DBClient} from "@/shared/types/db";
import {Err, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findSeasonRosters} from "@/server/db/seasonRosters.repo";
import {SeasonRosterEntry} from "../types";

export async function getSeasonRosters(supabase: DBClient, p: {seasonId: string}): Promise<Result<SeasonRosterEntry[]>> {
    try {
        const rows = await findSeasonRosters(supabase, p.seasonId);
        if (!rows.ok) {
            logger.error({seasonId: p.seasonId, error: rows.error}, "Failed to fetch season rosters");
        }
        return rows;
    } catch (error) {
        logger.error({error, seasonId: p.seasonId}, "Unexpected error fetching season rosters");
        return Err(serializeError(error));
    }
}
