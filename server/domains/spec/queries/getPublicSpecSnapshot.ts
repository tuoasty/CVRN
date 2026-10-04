import {DBClient} from "@/shared/types/db";
import {Ok, Result} from "@/shared/types/result";
import {findSpecSnapshotRegions, getSpecSnapshot} from "@/server/db/specSnapshot.repo";
import {DEFAULT_PLACEMENT_BONUS} from "../helpers/placementBonus";
import {PublishedSpecRegion, SpecSnapshotPayload} from "../types";

export async function getPublicSpecSnapshot(
    supabase: DBClient,
    regionId: string
): Promise<Result<SpecSnapshotPayload | null>> {
    const result = await getSpecSnapshot(supabase, regionId);
    if (!result.ok) return result;
    if (!result.value) return Ok(null);

    const payload = result.value.payload as unknown as Partial<SpecSnapshotPayload> & SpecSnapshotPayload;
    return Ok({...payload, placementBonus: payload.placementBonus ?? DEFAULT_PLACEMENT_BONUS});
}

export async function getPublishedSpecRegions(
    supabase: DBClient
): Promise<Result<PublishedSpecRegion[]>> {
    const result = await findSpecSnapshotRegions(supabase);
    if (!result.ok) return result;

    return Ok(
        result.value
            .map(r => ({regionId: r.region_id, code: r.code, name: r.name}))
            .sort((a, b) => a.code.localeCompare(b.code))
    );
}
