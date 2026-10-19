import {DBClient, Spec} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {findPublicSpecs, findSpecCatalog, findSpecsWithAllRegions, findSpecsWithRequirements, type PublicSpecRow} from "@/server/db/specs.repo";
import {SpecWithAllRegions, SpecWithRequirements} from "../types";

export async function getSpecs(
    supabase: DBClient,
    regionId: string
): Promise<Result<SpecWithRequirements[]>> {
    return findSpecsWithRequirements(supabase, regionId);
}

export async function getSpecsAllRegions(supabase: DBClient): Promise<Result<SpecWithAllRegions[]>> {
    return findSpecsWithAllRegions(supabase);
}

export async function getSpecCatalog(supabase: DBClient): Promise<Result<Spec[]>> {
    return findSpecCatalog(supabase);
}

export async function getPublicSpecs(supabase: DBClient): Promise<Result<PublicSpecRow[]>> {
    return findPublicSpecs(supabase);
}
