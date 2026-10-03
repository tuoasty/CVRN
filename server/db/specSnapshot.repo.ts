import {DBClient, PublicSpecSnapshotRow} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {SpecSnapshotPayload} from "@/server/domains/spec/types";

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

export async function getAnySpecSnapshot(
    supabase: DBClient
): Promise<Result<PublicSpecSnapshotRow | null>> {
    const {data, error} = await supabase
        .from("public_spec_snapshot")
        .select("*")
        .limit(1)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? null);
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

export async function deleteSpecSnapshot(supabase: DBClient, regionId: string): Promise<Result<true>> {
    const {error} = await supabase.from("public_spec_snapshot").delete().eq("region_id", regionId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
