import {DBClient, Spec} from "@/shared/types/db";
import {Result} from "@/shared/types/result";
import {updateSpecVaulted} from "@/server/db/specs.repo";
import {SetSpecVaultedInput} from "../types";

export async function setSpecVaulted(
    supabase: DBClient,
    input: SetSpecVaultedInput
): Promise<Result<Spec>> {
    return updateSpecVaulted(supabase, input.id, input.isVaulted);
}
