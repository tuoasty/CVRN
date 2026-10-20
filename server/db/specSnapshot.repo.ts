import {DBClient, PublicSpecSnapshotRow} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {SpecSnapshotPayload} from "@/server/domains/spec/types";
import {HeightRangeByStar} from "@/server/domains/spec/helpers/heightRange";

export async function getSpecSnapshot(
    supabase: DBClient,
    regionId: string
): Promise<Result<PublicSpecSnapshotRow | null>> {
    const {data, error} = await supabase
        .from("public_spec_snapshot")
        .select("*")
        .eq("region_id", regionId)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? null);
}

export async function findSpecSnapshotRegions(
    supabase: DBClient
): Promise<Result<{region_id: string; code: string; name: string}[]>> {
    const {data, error} = await supabase
        .from("public_spec_snapshot")
        .select("region_id, regions(code, name)");
    if (error) return Err(serializeError(error, "DB_ERROR"));

    return Ok(
        (data ?? []).flatMap(row => {
            const region = row.regions as {code: string; name: string} | null;
            return region ? [{region_id: row.region_id, code: region.code, name: region.name}] : [];
        })
    );
}

export async function upsertSpecSnapshot(
    supabase: DBClient,
    p: {regionId: string; payload: SpecSnapshotPayload; poolSize: number}
): Promise<Result<true>> {
    const {error} = await supabase.from("public_spec_snapshot").upsert({
        region_id: p.regionId,
        payload: p.payload as unknown as PublicSpecSnapshotRow["payload"],
        pool_size: p.poolSize,
        generated_at: new Date().toISOString(),
    });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function patchSnapshotHeightRanges(
    supabase: DBClient,
    regionIds: string[],
    byStar: HeightRangeByStar
): Promise<Result<true>> {
    const {data, error} = await supabase
        .from("public_spec_snapshot")
        .select("region_id, payload")
        .in("region_id", regionIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));

    for (const row of data ?? []) {
        const payload = {...(row.payload as Record<string, unknown>), heightRangeByStar: byStar};
        const {error: updateError} = await supabase
            .from("public_spec_snapshot")
            .update({payload: payload as unknown as PublicSpecSnapshotRow["payload"]})
            .eq("region_id", row.region_id);
        if (updateError) return Err(serializeError(updateError, "DB_ERROR"));
    }
    return Ok(true);
}

export async function deleteSpecSnapshot(supabase: DBClient, regionId: string): Promise<Result<true>> {
    const {error} = await supabase.from("public_spec_snapshot").delete().eq("region_id", regionId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
