import {DBClient} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {findSpecsWithRequirements} from "@/server/db/specs.repo";
import {SpecWithRequirements} from "../types";

// RLS does the narrowing: `specs` is public but `spec_requirements` has no anon
// policy, so an unauthenticated caller gets the catalog with empty requirement
// arrays rather than an error. Only admins ever see the thresholds.
export async function getSpecs(supabase: DBClient): Promise<Result<SpecWithRequirements[]>> {
    return findSpecsWithRequirements(supabase);
}
