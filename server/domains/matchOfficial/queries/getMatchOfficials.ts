import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findMatchOfficials} from "@/server/db/matchOfficial.repo";
import {lazySyncOfficial} from "@/server/domains/official";
import {MatchOfficialWithDetails, MatchIdInput} from "../types";

export async function getMatchOfficials(
    supabase: DBClient,
    p: MatchIdInput
): Promise<Result<MatchOfficialWithDetails[]>> {
    try {
        const {data, error} = await findMatchOfficials(supabase, p.matchId);

        if (error) {
            logger.error({matchId: p.matchId, error}, "Failed to fetch match officials");
            return Err(serializeError(error, "DB_ERROR"));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch match officials",
                code: "DB_ERROR"
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
        logger.error({error}, "Unexpected error fetching match officials");
        return Err(serializeError(error));
    }
}
