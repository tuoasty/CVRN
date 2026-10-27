import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {createError} from "@/server/utils/serializeableError";
import {findSpecsWithAllRegions} from "@/server/db/specs.repo";
import {findAllRegions} from "@/server/db/regions.repo";
import {buildSpecExport, specExportFilename} from "../helpers/specRequirementsFile";
import {ExportSpecRequirementsInput, SpecExportFile, isLeagueSpec} from "../types";

export async function exportSpecRequirements(
    supabase: DBClient,
    input: ExportSpecRequirementsInput
): Promise<Result<{filename: string; file: SpecExportFile}>> {
    const [specsRes, regionsRes] = await Promise.all([
        findSpecsWithAllRegions(supabase),
        findAllRegions(supabase),
    ]);
    if (!specsRes.ok) return specsRes;
    if (!regionsRes.ok) return regionsRes;

    const region = regionsRes.value.find(r => r.id === input.regionId);
    if (!region) return Err(createError("Region does not exist", "VALIDATION_ERROR", 400));

    const now = new Date();
    const file = buildSpecExport({
        specs: specsRes.value.filter(isLeagueSpec),
        regionId: region.id,
        exportedAt: now.toISOString(),
    });

    return Ok({filename: specExportFilename(region.code, now), file});
}
