import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findRecordsByScope} from "@/server/db/records.repo";
import {findSeasonsBySeasonNumber} from "@/server/db/seasons.repo";
import {getRegionByCode} from "@/server/domains/region";
import {mapRecordRow} from "../helpers/mapRecordRow";
import {groupRecords} from "../helpers/groupRecords";
import {scopeKeyFor} from "../helpers/scopeKey";
import type {GetRecordsInput, RecordEntry, RecordScope, RecordsPayload} from "../types";

const SEASON_NOT_FOUND = {message: "Season not found", code: "NOT_FOUND"} as const;

async function resolveScope(supabase: DBClient, input: GetRecordsInput): Promise<Result<RecordScope>> {
    const {regionCode, seasonNumber} = input;
    if (!regionCode && seasonNumber === undefined) return Ok({kind: "all"});

    const seasons = seasonNumber === undefined ? null : await findSeasonsBySeasonNumber(supabase, seasonNumber);
    if (seasons && !seasons.ok) return seasons;

    if (!regionCode) {
        if (!seasons || seasons.value.length === 0) return Err(SEASON_NOT_FOUND);
        return Ok({kind: "seasonNumber", seasonNumber: seasonNumber!});
    }

    const region = await getRegionByCode(supabase, regionCode);
    if (!region.ok) return region;

    if (!seasons) {
        return Ok({kind: "region", regionId: region.value.id, regionCode: region.value.code});
    }

    const season = seasons.value.find(s => s.region_id === region.value.id);
    if (!season) return Err(SEASON_NOT_FOUND);

    return Ok({
        kind: "season",
        regionId: region.value.id,
        regionCode: region.value.code,
        seasonId: season.id,
        seasonSlug: season.slug,
        seasonName: season.name,
        seasonNumber: season.season_number,
    });
}

export async function getRecords(supabase: DBClient, input: GetRecordsInput): Promise<Result<RecordsPayload>> {
    try {
        const scope = await resolveScope(supabase, input);
        if (!scope.ok) return scope;

        const rows = await findRecordsByScope(supabase, scopeKeyFor(scope.value));
        if (!rows.ok) {
            logger.error({input, error: rows.error}, "Failed to fetch records");
            return rows;
        }

        const entries = rows.value.map(mapRecordRow).filter((e): e is RecordEntry => e !== null);
        return Ok({scope: scope.value, book: groupRecords(entries)});
    } catch (error) {
        logger.error({error}, "Unexpected error fetching records");
        return Err(serializeError(error));
    }
}
