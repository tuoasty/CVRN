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
        const {data, error} = await findMatchOfficialsByType(supabase, matchId, officialType);

        if (error) {
            logger.error({matchId, officialType, error}, "Failed to fetch match officials by type");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch match officials by type",
                name: "FetchError"
            });
        }

        const syncedOfficials: MatchOfficialWithDetails[] = await Promise.all(
            data.map(async (matchOfficial) => {
                if (!matchOfficial.official) return matchOfficial;
                const result = await lazySyncOfficial(supabase, matchOfficial.official);
                return result.ok
                    ? { ...matchOfficial, official: result.value }
                    : matchOfficial;
            })
        );

        return Ok(syncedOfficials);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching match officials by type");
        return Err(serializeError(error));
    }
}
