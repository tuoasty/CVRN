import {DBClient, Season} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError, SerializableError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {
    insertSeason,
    findAllSeasons,
    findSeasonById,
    findSeasonsByRegion,
    findActiveSeasonByRegion,
    updateSeasonById,
    deleteSeasonById
} from "@/server/db/seasons.repo";
import {CreateSeasonInput, SeasonIdInput, UpdateSeasonInput} from "@/server/dto/season.dto";
import {randomUUID} from "node:crypto";

export async function createSeason(
    supabase: DBClient,
    p: CreateSeasonInput
): Promise<Result<Season, SerializableError>> {
    try {
        const seasonId = randomUUID();

        const {data, error} = await insertSeason(supabase, {
            id: seasonId,
            name: p.name,
            regionId: p.regionId,
            startDate: p.startDate,
            endDate: p.endDate ?? null,
            isActive: false
        });

        if (error) {
            logger.error({input: p, error}, "Failed to insert season");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                name: "InsertError",
                message: "Failed to create season"
            });
        }

        return Ok(data as Season);
    } catch (error) {
        logger.error({error}, "Unexpected error creating season");
        return Err(serializeError(error));
    }
}

export async function getAllSeasons(
    supabase: DBClient
): Promise<Result<Season[], SerializableError>> {
    try {
        const {data, error} = await findAllSeasons(supabase);

        if (error) {
            logger.error({error}, "Failed to fetch all seasons");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch seasons",
                name: "FetchError"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching all seasons");
        return Err(serializeError(error));
    }
}

export async function getSeasonById(
    supabase: DBClient,
    p: SeasonIdInput
): Promise<Result<Season, SerializableError>> {
    try {
        const {data, error} = await findSeasonById(supabase, p.seasonId);

        if (error) {
            logger.error({seasonId: p.seasonId, error}, "Failed to fetch season by id");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Season not found",
                name: "NotFoundError"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching season by id");
        return Err(serializeError(error));
    }
}

export async function getSeasonsByRegion(
    supabase: DBClient,
    regionId: string
): Promise<Result<Season[], SerializableError>> {
    try {
        const {data, error} = await findSeasonsByRegion(supabase, regionId);

        if (error) {
            logger.error({regionId, error}, "Failed to fetch seasons by region");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Failed to fetch seasons",
                name: "FetchError"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching seasons by region");
        return Err(serializeError(error));
    }
}

export async function getActiveSeasonByRegion(
    supabase: DBClient,
    regionId: string
): Promise<Result<Season, SerializableError>> {
    try {
        const {data, error} = await findActiveSeasonByRegion(supabase, regionId);

        if (error) {
            logger.error({regionId, error}, "Failed to fetch active season by region");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "No active season found for region",
                name: "NotFoundError"
            });
        }

        return Ok(data);
    } catch (error) {
        logger.error({error}, "Unexpected error fetching active season by region");
        return Err(serializeError(error));
    }
}

export async function updateSeason(
    supabase: DBClient,
    p: UpdateSeasonInput
): Promise<Result<Season, SerializableError>> {
    try {
        const {data, error} = await updateSeasonById(supabase, p.seasonId, {
            name: p.name,
            startDate: p.startDate,
            endDate: p.endDate,
            isActive: p.isActive
        });

        if (error) {
            logger.error({input: p, error}, "Failed to update season");
            return Err(serializeError(error));
        }

        if (!data) {
            return Err({
                message: "Season not found",
                name: "NotFoundError"
            });
        }

        return Ok(data as Season);
    } catch (error) {
        logger.error({error}, "Unexpected error updating season");
        return Err(serializeError(error));
    }
}

export async function deleteSeason(
    supabase: DBClient,
    p: SeasonIdInput
): Promise<Result<void, SerializableError>> {
    try {
        const {data: season} = await findSeasonById(supabase, p.seasonId);

        if (!season) {
            logger.warn({seasonId: p.seasonId}, "Attempted to delete non-existent season");
            return Err({
                name: "SeasonNotFound",
                message: "Season does not exist"
            });
        }

        const {error} = await deleteSeasonById(supabase, p.seasonId);

        if (error) {
            logger.error({seasonId: p.seasonId, error}, "Failed to delete season");
            return Err(serializeError(error));
        }

        return Ok(undefined);
    } catch (error) {
        logger.error({error}, "Unexpected error deleting season");
        return Err(serializeError(error));
    }
}