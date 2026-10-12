import {DBClient} from "@/shared/types/db";
import {Ok, Result} from "@/shared/types/result";
import {findSpecSnapshotRegions, getSpecSnapshot} from "@/server/db/specSnapshot.repo";
import {findVaultedSpecIds} from "@/server/db/specs.repo";
import {DEFAULT_PLACEMENT_BONUS} from "../helpers/placementBonus";
import {PublishedSpecRegion, SpecSnapshotPayload} from "../types";

export async function getPublicSpecSnapshot(
    supabase: DBClient,
    regionId: string
): Promise<Result<SpecSnapshotPayload | null>> {
    const [result, vaultedResult] = await Promise.all([
        getSpecSnapshot(supabase, regionId),
        findVaultedSpecIds(supabase),
    ]);
    if (!result.ok) return result;
    if (!vaultedResult.ok) return vaultedResult;
    if (!result.value) return Ok(null);

    const payload = result.value.payload as unknown as Partial<SpecSnapshotPayload> & SpecSnapshotPayload;
    const vaulted = new Set(vaultedResult.value);
    return Ok({
        ...payload,
        specs: payload.specs.filter(spec => !vaulted.has(spec.id)),
        placementBonus: payload.placementBonus ?? DEFAULT_PLACEMENT_BONUS,
    });
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
