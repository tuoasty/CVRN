import {DBClient, Season} from "@/shared/types/db";
import {InsertSeasonDto} from "@/server/domains/season";
import {Database} from "@/database.types";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

type SeasonWithPlayoffConfig = Database["public"]["Tables"]["seasons"]["Row"] & {
    playoff_configs: Database["public"]["Tables"]["playoff_configs"]["Row"] | null;
};

export async function insertSeason(supabase: DBClient, p: InsertSeasonDto): Promise<Result<Season>> {
    const {data, error} = await supabase
        .from("seasons")
        .insert({
            ...(p.id && {id: p.id}),
            name: p.name,
            region_id: p.regionId,
            start_date: p.startDate,
            end_date: p.endDate,
            slug: p.slug,
            theme: p.theme ?? null,
            is_active: p.isActive
        })
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findAllSeasons(supabase: DBClient): Promise<Result<SeasonWithPlayoffConfig[]>> {
    const {data, error} = await supabase
        .from("seasons")
        .select("*, playoff_configs(*)")
        .order("start_date", {ascending: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as SeasonWithPlayoffConfig[]);
}

export async function findSeasonById(supabase: DBClient, seasonId: string): Promise<Result<Season | null>> {
    const {data, error} = await supabase
        .from("seasons")
        .select("*")
        .eq("id", seasonId)
        .single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data);
}

export async function findSeasonsByRegion(supabase: DBClient, regionId: string): Promise<Result<Season[]>> {
    const {data, error} = await supabase
        .from("seasons")
        .select("*")
        .eq("region_id", regionId)
        .order("start_date", {ascending: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findActiveSeasonByRegion(supabase: DBClient, regionId: string): Promise<Result<Season | null>> {
    const {data, error} = await supabase
        .from("seasons")
        .select("*")
        .eq("region_id", regionId)
        .eq("is_active", true)
        .single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data);
}

export async function updateSeasonById(
    supabase: DBClient,
    seasonId: string,
    updates: {
        name?: string;
        startDate?: string;
        endDate?: string;
        isActive?: boolean;
        slug?: string;
        theme?: string | null;
    }
): Promise<Result<Season>> {
    const payload: Record<string, unknown> = {};

    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.startDate !== undefined) payload.start_date = updates.startDate;
    if (updates.endDate !== undefined) payload.end_date = updates.endDate;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.theme !== undefined) payload.theme = updates.theme;

    const {data, error} = await supabase
        .from("seasons")
        .update(payload)
        .eq("id", seasonId)
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function deleteSeasonById(supabase: DBClient, seasonId: string): Promise<Result<true>> {
    const {error} = await supabase
        .from("seasons")
        .delete()
        .eq("id", seasonId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function findSeasonBySlugAndRegion(
    supabase: DBClient,
    slug: string,
    regionId: string
): Promise<Result<Season | null>> {
    const {data, error} = await supabase
        .from("seasons")
        .select("*")
        .eq("slug", slug)
        .eq("region_id", regionId)
        .single();
    if (error) {
        if (error.code === "PGRST116") return Ok(null);
        return Err(serializeError(error, "DB_ERROR"));
    }
    return Ok(data);
}
