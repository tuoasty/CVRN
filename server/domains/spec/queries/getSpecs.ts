import {DBClient} from "@/shared/types/db";
import {Ok, Result} from "@/shared/types/result";
import {findPublicSpecs, findSpecCatalog, findSpecsWithAllRegions, findSpecsWithRequirements, type PublicSpecRow} from "@/server/db/specs.repo";
import {LeagueSpec, SpecWithAllRegions, SpecWithRequirements, isLeagueSpec} from "../types";

export async function getSpecs(
    supabase: DBClient,
    regionId: string
): Promise<Result<SpecWithRequirements[]>> {
    return findSpecsWithRequirements(supabase, regionId);
}

export async function getSpecsAllRegions(supabase: DBClient): Promise<Result<SpecWithAllRegions[]>> {
    return findSpecsWithAllRegions(supabase);
}

export async function getSpecCatalog(supabase: DBClient): Promise<Result<LeagueSpec[]>> {
    const result = await findSpecCatalog(supabase);
    if (!result.ok) return result;
    return Ok(result.value.filter(isLeagueSpec));
}

export async function getPublicSpecs(supabase: DBClient): Promise<Result<PublicSpecRow[]>> {
    return findPublicSpecs(supabase);
}
