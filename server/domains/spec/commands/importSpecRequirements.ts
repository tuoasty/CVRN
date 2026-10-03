import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {createError} from "@/server/utils/serializeableError";
import {findSpecsWithAllRegions, replaceRegionSpecRequirements} from "@/server/db/specs.repo";
import {findAllRegions} from "@/server/db/regions.repo";
import {diffSpecImport, validateSpecImport} from "../helpers/specRequirementsFile";
import {ImportSpecRequirementsInput, SpecImportResult} from "../types";

export async function importSpecRequirements(
    supabase: DBClient,
    input: ImportSpecRequirementsInput
): Promise<Result<SpecImportResult>> {
    const [specsRes, regionsRes] = await Promise.all([
        findSpecsWithAllRegions(supabase),
        findAllRegions(supabase),
    ]);
    if (!specsRes.ok) return specsRes;
    if (!regionsRes.ok) return regionsRes;

    const region = regionsRes.value.find(r => r.id === input.regionId);
    if (!region) return Err(createError("Region does not exist", "VALIDATION_ERROR", 400));

    const validation = validateSpecImport(input.file, {specs: specsRes.value});
    if (!validation.ok) return Ok({status: "rejected", issues: validation.issues});

    const diff = diffSpecImport(region, validation.specs, specsRes.value);
    if (input.dryRun) return Ok({status: "preview", diff});

    const res = await replaceRegionSpecRequirements(supabase, region.id, validation.specs);
    if (!res.ok) return res;

    return Ok({status: "applied", diff});
}
