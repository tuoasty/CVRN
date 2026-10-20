import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {createError} from "@/server/utils/serializeableError";
import {findSpecsWithRequirements} from "@/server/db/specs.repo";
import {upsertSpecSnapshot} from "@/server/db/specSnapshot.repo";
import {getPlacementBonus} from "../queries/getPlacementBonus";
import {getSpecHeightRanges} from "@/server/db/specBonuses.repo";
import {buildSpecSnapshot} from "../helpers/buildSpecSnapshot";

export async function generateSpecSnapshot(
    supabase: DBClient,
    regionId: string
): Promise<Result<{specCount: number; statCount: number; skippedSpecs: string[]; emptySpecCount: number}>> {
    const [specsResult, bonusResult, heightResult] = await Promise.all([
        findSpecsWithRequirements(supabase, regionId),
        getPlacementBonus(supabase, regionId),
        getSpecHeightRanges(supabase, regionId),
    ]);
    if (!specsResult.ok) return specsResult;
    if (!bonusResult.ok) return bonusResult;
    if (!heightResult.ok) return heightResult;

    const built = buildSpecSnapshot(specsResult.value, bonusResult.value.config, new Date().toISOString(), heightResult.value);
    if (built.payload.specs.length === 0) {
        const reason = built.skippedSpecs.length > 0
            ? `every spec with requirements has unset values (${built.skippedSpecs.join(", ")})`
            : "no spec has requirements in this region";
        return Err(createError(`Nothing to publish: ${reason}`, "VALIDATION_ERROR", 400));
    }

    const upsert = await upsertSpecSnapshot(supabase, {
        regionId,
        payload: built.payload,
        poolSize: built.statCount,
    });
    if (!upsert.ok) return upsert;

    return Ok({
        specCount: built.payload.specs.length,
        statCount: built.statCount,
        skippedSpecs: built.skippedSpecs,
        emptySpecCount: built.emptySpecCount,
    });
}
