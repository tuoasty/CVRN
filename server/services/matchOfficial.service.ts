import {DBClient, MatchOfficial, Official} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {
    assignOfficial,
    assignMultipleOfficials,
    findMatchOfficials,
    findMatchOfficialsByType,
    removeOfficial,
    removeAllOfficialsByType,
} from "@/server/db/matchOfficial.repo";
import {
    AssignMultipleOfficialsInput,
    AssignOfficialInput,
    MatchIdInput,
    OfficialType
} from "@/server/dto/matchOfficial.dto";
import {lazySyncOfficial} from "@/server/services/official.service";

export interface MatchOfficialWithDetails extends MatchOfficial {
    official: Official;
}

export async function assignOfficialToMatch(
    supabase: DBClient,
    p: AssignOfficialInput
): Promise<Result<MatchOfficial>> {
    try {
        const {data, error} = await assignOfficial(supabase, p);

        if (error) {
            logger.error({input: p, error}, "Failed to assign official to match");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "AssignError",
                message: "Failed to assign official to match"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error assigning official to match");
        return Err(serializeError(error));
    }
}

export async function assignMultipleOfficialsToMatch(
    supabase: DBClient,
    p: AssignMultipleOfficialsInput
): Promise<Result<MatchOfficial[]>> {
    try {
        const {data, error} = await assignMultipleOfficials(
            supabase,
            p.matchId,
            p.officialIds,
            p.officialType
        );

        if (error) {
            logger.error({input: p, error}, "Failed to assign multiple officials to match");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "AssignError",
                message: "Failed to assign officials to match"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error assigning multiple officials to match");
        return Err(serializeError(error));
    }
}

export async function getMatchOfficials(
    supabase: DBClient,
    p: MatchIdInput
): Promise<Result<MatchOfficialWithDetails[]>> {
    try {
        const {data, error} = await findMatchOfficials(supabase, p.matchId);

        if (error) {
            logger.error({matchId: p.matchId, error}, "Failed to fetch match officials");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch match officials",
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
        logger.error({error}, "Unexpected error fetching match officials");
        return Err(serializeError(error));
    }
}

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

export async function removeOfficialFromMatch(
    supabase: DBClient,
    matchId: string,
    officialId: string,
    officialType: OfficialType
): Promise<Result<boolean>> {
    try {
        const {error} = await removeOfficial(supabase, matchId, officialId, officialType);

        if (error) {
            logger.error({matchId, officialId, officialType, error}, "Failed to remove official from match");
            return Err(serializeError(error));
        }

        return Ok(true);
    } catch (error) {
        logger.error({error}, "Unexpected error removing official from match");
        return Err(serializeError(error));
    }
}

export async function removeAllOfficialsOfType(
    supabase: DBClient,
    matchId: string,
    officialType: OfficialType
): Promise<Result<boolean>> {
    try {
        const {error} = await removeAllOfficialsByType(supabase, matchId, officialType);

        if (error) {
            logger.error({matchId, officialType, error}, "Failed to remove all officials of type from match");
            return Err(serializeError(error));
        }

        return Ok(true);
    } catch (error) {
        logger.error({error}, "Unexpected error removing all officials of type from match");
        return Err(serializeError(error));
    }
}