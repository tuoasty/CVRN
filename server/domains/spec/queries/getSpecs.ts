import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {findSpecsWithRequirements} from "@/server/db/specs.repo";
import {SpecWithRequirements} from "../types";

export async function getSpecs(supabase: DBClient): Promise<Result<SpecWithRequirements[]>> {
    return findSpecsWithRequirements(supabase);
}
