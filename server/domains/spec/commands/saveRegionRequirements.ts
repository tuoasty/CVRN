import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {replaceRegionSpecRequirements} from "@/server/db/specs.repo";
import {SaveRegionRequirementsInput} from "../types";

export async function saveRegionRequirements(
    supabase: DBClient,
    input: SaveRegionRequirementsInput
): Promise<Result<true>> {
    return replaceRegionSpecRequirements(supabase, input.regionId, input.specs);
}
