import {DBClient} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {createError} from "@/server/utils/serializeableError";
import {
    findSpecWithRequirements,
    replaceSpecRequirements,
    upsertSpec,
} from "@/server/db/specs.repo";
import {SaveSpecInput, SpecWithRequirements} from "../types";

/**
 * Creates or updates a spec and its full requirement set.
 *
 * Two writes, not one transaction. Both invariants that could be violated —
 * duplicate stat keys, and secondary_required exceeding the secondary row count —
 * are checked by SaveSpecSchema before either write runs, so the only way to land
 * half-applied is a connection drop between them, which the caller sees as an
 * error and resolves by saving again. An RPC would close that window; it is not
 * worth one for a single-operator admin screen.
 */
export async function saveSpec(
    supabase: DBClient,
    input: SaveSpecInput
): Promise<Result<SpecWithRequirements>> {
    const specResult = await upsertSpec(supabase, {
        id: input.id,
        name: input.name,
        stars: input.stars,
        secondaryRequired: input.secondaryRequired,
    });
    if (!specResult.ok) return specResult;

    const reqResult = await replaceSpecRequirements(
        supabase,
        specResult.value.id,
        input.requirements
    );
    if (!reqResult.ok) return reqResult;

    const saved = await findSpecWithRequirements(supabase, specResult.value.id);
    if (!saved.ok) return saved;
    if (!saved.value) return Err(createError("Spec vanished after save", "NOT_FOUND", 404));

    return Ok(saved.value);
}
