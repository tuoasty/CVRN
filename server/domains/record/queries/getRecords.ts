import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {findRecordsByScope} from "@/server/db/records.repo";
import {getRegionByCode} from "@/server/domains/region";
import {getSeasonBySlugAndRegion} from "@/server/domains/season";
import {mapRecordRow} from "../helpers/mapRecordRow";
import {groupRecords} from "../helpers/groupRecords";
import {scopeKeyFor} from "../helpers/scopeKey";
import type {GetRecordsInput, RecordEntry, RecordScope, RecordsPayload} from "../types";

async function resolveScope(supabase: DBClient, input: GetRecordsInput): Promise<Result<RecordScope>> {
    if (!input.regionCode) return Ok({kind: "all"});

    const region = await getRegionByCode(supabase, input.regionCode);
    if (!region.ok) return region;

    if (!input.seasonSlug) {
        return Ok({kind: "region", regionId: region.value.id, regionCode: region.value.code});
    }

    const season = await getSeasonBySlugAndRegion(supabase, input.seasonSlug, region.value.id);
    if (!season.ok) return season;

    return Ok({
        kind: "season",
        regionId: region.value.id,
        regionCode: region.value.code,
        seasonId: season.value.id,
        seasonSlug: season.value.slug,
        seasonName: season.value.name,
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
