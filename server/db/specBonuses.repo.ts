import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {PlacementBonusConfig} from "@/server/domains/spec/types";
import {HeightRangeByStar, normalizeHeightRanges} from "@/server/domains/spec/helpers/heightRange";

export async function getSpecBonus(
    supabase: DBClient,
    regionId: string
): Promise<Result<PlacementBonusConfig | null>> {
    const {data, error} = await supabase
        .from("spec_bonuses")
        .select("upper_finalist, ladder, outside, scope_count, scope_per_set, scope_pct")
        .eq("region_id", regionId)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    if (!data) return Ok(null);
    return Ok({
        upperFinalist: data.upper_finalist,
        ladder: data.ladder,
        outside: data.outside,
        scope: {
            count: data.scope_count,
            per_set: data.scope_per_set,
            pct: data.scope_pct,
        },
    });
}

export async function upsertSpecBonus(
    supabase: DBClient,
    regionId: string,
    cfg: PlacementBonusConfig
): Promise<Result<true>> {
    const {error} = await supabase.from("spec_bonuses").upsert({
        region_id: regionId,
        upper_finalist: cfg.upperFinalist,
        ladder: cfg.ladder,
        outside: cfg.outside,
        scope_count: cfg.scope.count,
        scope_per_set: cfg.scope.per_set,
        scope_pct: cfg.scope.pct,
        updated_at: new Date().toISOString(),
    });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function getSpecHeightRanges(
    supabase: DBClient,
    regionId: string
): Promise<Result<HeightRangeByStar>> {
    const {data, error} = await supabase
        .from("spec_bonuses")
        .select("height_range_by_star")
        .eq("region_id", regionId)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(normalizeHeightRanges(data?.height_range_by_star));
}

export async function upsertSpecHeightRanges(
    supabase: DBClient,
    regionIds: string[],
    byStar: HeightRangeByStar
): Promise<Result<true>> {
    const updatedAt = new Date().toISOString();
    const {error} = await supabase.from("spec_bonuses").upsert(
        regionIds.map(regionId => ({region_id: regionId, height_range_by_star: byStar, updated_at: updatedAt}))
    );
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
