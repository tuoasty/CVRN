import {DBClient} from "@/shared/types/db";
import {InsertSeasonDto} from "@/server/domains/season";

export async function insertSeason(supabase: DBClient, p: InsertSeasonDto) {
    return supabase
        .from("seasons")
        .insert({
            ...(p.id && { id: p.id }),
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
}

export async function findAllSeasons(supabase: DBClient) {
    return supabase
        .from("seasons")
        .select("*, playoff_configs(*)")
        .order("start_date", { ascending: false });
}

export async function findSeasonById(supabase: DBClient, seasonId: string) {
    return supabase
        .from("seasons")
        .select("*")
        .eq("id", seasonId)
        .single();
}

export async function findSeasonsByRegion(supabase: DBClient, regionId: string) {
    return supabase
        .from("seasons")
        .select("*")
        .eq("region_id", regionId)
        .order("start_date", { ascending: false });
}

export async function findActiveSeasonByRegion(supabase: DBClient, regionId: string) {
    return supabase
        .from("seasons")
        .select("*")
        .eq("region_id", regionId)
        .eq("is_active", true)
        .single();
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
) {
    const payload: Record<string, unknown> = {};

    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.startDate !== undefined) payload.start_date = updates.startDate;
    if (updates.endDate !== undefined) payload.end_date = updates.endDate;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.slug !== undefined) payload.slug = updates.slug;
    if (updates.theme !== undefined) payload.theme = updates.theme;

    return supabase
        .from("seasons")
        .update(payload)
        .eq("id", seasonId)
        .select()
        .single();
}

export async function deleteSeasonById(supabase: DBClient, seasonId: string) {
    return supabase
        .from("seasons")
        .delete()
        .eq("id", seasonId);
}

export async function findSeasonBySlugAndRegion(
    supabase: DBClient,
    slug: string,
    regionId: string
) {
    return supabase
        .from("seasons")
        .select("*")
        .eq("slug", slug)
        .eq("region_id", regionId)
        .single();
}