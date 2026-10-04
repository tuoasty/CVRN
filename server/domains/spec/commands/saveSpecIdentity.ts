import {DBClient, Spec} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {upsertSpecIdentity} from "@/server/db/specs.repo";
import {SaveSpecIdentityInput} from "../types";

export async function saveSpecIdentity(
    supabase: DBClient,
    input: SaveSpecIdentityInput
): Promise<Result<Spec>> {
    return upsertSpecIdentity(supabase, input);
}
