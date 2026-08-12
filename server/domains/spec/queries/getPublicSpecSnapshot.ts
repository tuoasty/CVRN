import {DBClient} from "@/shared/types/db";
import {Ok, Result} from "@/shared/types/result";
import {getSpecSnapshot} from "@/server/db/specSnapshot.repo";
import {SpecSnapshotPayload} from "../types";

export async function getPublicSpecSnapshot(
    supabase: DBClient
): Promise<Result<SpecSnapshotPayload | null>> {
    const result = await getSpecSnapshot(supabase);
    if (!result.ok) return result;
    if (!result.value) return Ok(null);

    return Ok(result.value.payload as unknown as SpecSnapshotPayload);
}
