import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchOfficialsByType} from "@/server/db/matchOfficial.repo";
import {lazySyncOfficial} from "@/server/domains/official";
import {MatchOfficialWithDetails, OfficialType} from "../types";

export async function getMatchOfficialsByType(
    supabase: DBClient,
    matchId: string,
    officialType: OfficialType
): Promise<Result<MatchOfficialWithDetails[]>> {
    try {
        const result = await findMatchOfficialsByType(supabase, matchId, officialType);
        if (!result.ok) {
            logger.error({matchId, officialType, error: result.error}, "Failed to fetch match officials by type");
            return result;
        }

        const syncedOfficials = await Promise.all(
            result.value.map(async (matchOfficial) => {
                if (!matchOfficial.official) return matchOfficial;
                const syncResult = await lazySyncOfficial(supabase, matchOfficial.official);
                return syncResult.ok
                    ? { ...matchOfficial, official: syncResult.value }
                    : matchOfficial;
            })
        ) as unknown as MatchOfficialWithDetails[];

        return Ok(syncedOfficials);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching match officials by type");
        return Err(serializeError(error));
    }
}
