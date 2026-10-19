import {DBClient, Spec} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {updateSpecFacts} from "@/server/db/specs.repo";
import {SaveSpecFactsInput} from "../types";

export async function saveSpecFacts(
    supabase: DBClient,
    input: SaveSpecFactsInput
): Promise<Result<Spec>> {
    return updateSpecFacts(supabase, input);
}
