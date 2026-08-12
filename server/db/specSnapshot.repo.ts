import {DBClient, PublicSpecSnapshotRow} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {SpecSnapshotPayload} from "@/server/domains/spec/types";

export async function getSpecSnapshot(
    supabase: DBClient
): Promise<Result<PublicSpecSnapshotRow | null>> {
    const {data, error} = await supabase
        .from("public_spec_snapshot")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? null);
}

export async function upsertSpecSnapshot(
    supabase: DBClient,
    p: {payload: SpecSnapshotPayload; poolSize: number}
): Promise<Result<true>> {
    const {error} = await supabase.from("public_spec_snapshot").upsert({
        id: 1,
        payload: p.payload as unknown as PublicSpecSnapshotRow["payload"],
        pool_size: p.poolSize,
        generated_at: new Date().toISOString(),
    });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function deleteSpecSnapshot(supabase: DBClient): Promise<Result<true>> {
    const {error} = await supabase.from("public_spec_snapshot").delete().eq("id", 1);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
