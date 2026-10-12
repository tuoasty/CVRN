import {DBClient, Spec, SpecRegionRule, SpecRequirement} from "@/shared/types/db";
import type {Json} from "@/database.types";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {ResolvedRequirement, SpecWithAllRegions, SpecWithRequirements} from "@/server/domains/spec/types";

type SpecEmbedRow = Spec & {spec_requirements: SpecRequirement[] | null; spec_region_rules: SpecRegionRule[] | null};

export async function findSpecsWithRequirements(
    supabase: DBClient,
    regionId: string
): Promise<Result<SpecWithRequirements[]>> {
    const {data, error} = await supabase
        .from("specs")
        .select("*, spec_requirements(*), spec_region_rules(*)")
        .eq("spec_requirements.region_id", regionId)
        .eq("spec_region_rules.region_id", regionId)
        .order("position", {ascending: true})
        .order("stars", {ascending: false})
        .order("name", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));

    return Ok(
        ((data ?? []) as unknown as SpecEmbedRow[]).map(row => {
            const {spec_requirements, spec_region_rules, ...spec} = row;
            return {
                ...spec,
                secondary_required: spec_region_rules?.[0]?.secondary_required ?? 0,
                requirements: spec_requirements ?? [],
            };
        })
    );
}

export async function findSpecsWithAllRegions(
    supabase: DBClient
): Promise<Result<SpecWithAllRegions[]>> {
    const {data, error} = await supabase
        .from("specs")
        .select("*, spec_requirements(*), spec_region_rules(*)")
        .order("position", {ascending: true})
        .order("stars", {ascending: false})
        .order("name", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));

    return Ok(
        ((data ?? []) as unknown as SpecEmbedRow[]).map(row => {
            const {spec_requirements, spec_region_rules, ...spec} = row;
            return {...spec, requirements: spec_requirements ?? [], rules: spec_region_rules ?? []};
        })
    );
}

export async function findSpecCatalog(supabase: DBClient): Promise<Result<Spec[]>> {
    const {data, error} = await supabase
        .from("specs")
        .select("*")
        .order("position", {ascending: true})
        .order("stars", {ascending: false})
        .order("name", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findVaultedSpecIds(supabase: DBClient): Promise<Result<string[]>> {
    const {data, error} = await supabase.from("specs").select("id").eq("is_vaulted", true);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []).map(r => r.id));
}

export async function updateSpecVaulted(supabase: DBClient, id: string, isVaulted: boolean): Promise<Result<Spec>> {
    const {data, error} = await supabase
        .from("specs")
        .update({is_vaulted: isVaulted, updated_at: new Date().toISOString()})
        .eq("id", id)
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function upsertSpecIdentity(
    supabase: DBClient,
    p: {id?: string; name: string; stars: number; position: string; height: number}
): Promise<Result<Spec>> {
    const payload = {
        ...(p.id ? {id: p.id} : {}),
        name: p.name,
        stars: p.stars,
        position: p.position,
        height: p.height,
        updated_at: new Date().toISOString(),
    };

    const {data, error} = await supabase.from("specs").upsert(payload).select().single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function replaceRegionSpecRequirements(
    supabase: DBClient,
    regionId: string,
    specs: {specId: string; secondaryRequired: number; requirements: ResolvedRequirement[]}[]
): Promise<Result<true>> {
    const payload = specs.map(s => ({
        spec_id: s.specId,
        secondary_required: s.secondaryRequired,
        requirements: s.requirements.map(r => ({
            tier: r.tier,
            stat_key: r.statKey,
            min_value: r.minValue,
        })),
    }));

    const {error} = await supabase.rpc("replace_region_spec_requirements", {
        p_region_id: regionId,
        p_specs: payload as unknown as Json,
    });
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function deleteSpec(supabase: DBClient, id: string): Promise<Result<true>> {
    const {error} = await supabase.from("specs").delete().eq("id", id);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
