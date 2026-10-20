import {DBClient} from "@/shared/types/db";
import {Ok, Result} from "@/shared/types/result";
import {upsertSpecHeightRanges} from "@/server/db/specBonuses.repo";
import {patchSnapshotHeightRanges} from "@/server/db/specSnapshot.repo";
import {HeightRangeByStar} from "../helpers/heightRange";
import {SaveHeightRangesInput} from "../types";

export async function saveHeightRanges(
    supabase: DBClient,
    input: SaveHeightRangesInput
): Promise<Result<HeightRangeByStar>> {
    const byStar: HeightRangeByStar = {...input.byStar};
    const saved = await upsertSpecHeightRanges(supabase, input.regionIds, byStar);
    if (!saved.ok) return saved;
    const patched = await patchSnapshotHeightRanges(supabase, input.regionIds, byStar);
    if (!patched.ok) return patched;
    return Ok(byStar);
}
