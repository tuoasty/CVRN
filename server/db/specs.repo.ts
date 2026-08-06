import {DBClient, Spec, SpecRequirement} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {SpecRequirementInput, SpecWithRequirements} from "@/server/domains/spec/types";

export async function findSpecsWithRequirements(
    supabase: DBClient
): Promise<Result<SpecWithRequirements[]>> {
    const {data, error} = await supabase
        .from("specs")
        .select("*, spec_requirements(*)")
        .order("position", {ascending: true})
        .order("stars", {ascending: false})
        .order("name", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));

    return Ok(
        (data ?? []).map(row => {
            const {spec_requirements, ...spec} = row as Spec & {spec_requirements: SpecRequirement[]};
            return {...spec, requirements: spec_requirements ?? []};
        })
    );
}

export async function findSpecWithRequirements(
    supabase: DBClient,
    id: string
): Promise<Result<SpecWithRequirements | null>> {
    const {data, error} = await supabase
        .from("specs")
        .select("*, spec_requirements(*)")
        .eq("id", id)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    if (!data) return Ok(null);

    const {spec_requirements, ...spec} = data as Spec & {spec_requirements: SpecRequirement[]};
    return Ok({...spec, requirements: spec_requirements ?? []});
}

export async function upsertSpec(
    supabase: DBClient,
    p: {id?: string; name: string; stars: number; position: string; height: number; secondaryRequired: number}
): Promise<Result<Spec>> {
    const payload = {
        ...(p.id ? {id: p.id} : {}),
        name: p.name,
        stars: p.stars,
        position: p.position,
        height: p.height,
        secondary_required: p.secondaryRequired,
        updated_at: new Date().toISOString(),
    };

    const {data, error} = await supabase.from("specs").upsert(payload).select().single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function replaceSpecRequirements(
    supabase: DBClient,
    specId: string,
    requirements: SpecRequirementInput[]
): Promise<Result<true>> {
    const {error: delError} = await supabase
        .from("spec_requirements")
        .delete()
        .eq("spec_id", specId);
    if (delError) return Err(serializeError(delError, "DB_ERROR"));

    if (requirements.length === 0) return Ok(true);

    const {error} = await supabase.from("spec_requirements").insert(
        requirements.map(r => ({
            spec_id: specId,
            tier: r.tier,
            stat_key: r.statKey,
            min_value: r.minValue,
        }))
    );
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function deleteSpec(supabase: DBClient, id: string): Promise<Result<true>> {
    const {error} = await supabase.from("specs").delete().eq("id", id);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
