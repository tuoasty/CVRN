import {DBClient} from "@/shared/types/db";
import {SaveOfficialInput, UpdateOfficialInput} from "@/server/dto/official.dto";

export async function upsertOfficial(
    supabase: DBClient,
    p: SaveOfficialInput
){
    return supabase.from("officials")
        .upsert(
            {
                roblox_user_id: String(p.robloxUserId),
                username: p.username,
                avatar_url: p.avatarUrl ?? null,
                display_name: p.displayName ?? null,
                last_synced_at: new Date().toISOString()
            },
            {
                onConflict: "roblox_user_id",
            }
        )
        .select()
        .single()
}

export async function findOfficialById(
    supabase: DBClient,
    id: string
) {
    return supabase.from("officials")
        .select("*")
        .eq("id", id)
        .maybeSingle()
}

export async function findOfficialByRobloxId(
    supabase: DBClient,
    robloxUserId: string
) {
    return supabase.from("officials")
        .select("*")
        .eq("roblox_user_id", robloxUserId)
        .maybeSingle()
}

export async function findAllOfficials(
    supabase: DBClient
) {
    return supabase.from("officials")
        .select("*")
        .order("created_at", { ascending: false })
}

export async function updateOfficial(
    supabase: DBClient,
    p: UpdateOfficialInput
) {
    const updates: Record<string, unknown> = {}

    if (p.username !== undefined) updates.username = p.username
    if (p.avatarUrl !== undefined) updates.avatar_url = p.avatarUrl
    if (p.lastSyncedAt !== undefined) updates.last_synced_at = p.lastSyncedAt
    if (p.displayName !== undefined) updates.display_name = p.displayName

    return supabase
        .from("officials")
        .update(updates)
        .eq("roblox_user_id", p.robloxUserId)
        .select()
        .single()
}

export async function deleteOfficial(
    supabase: DBClient,
    id: string
) {
    return supabase.from("officials")
        .delete()
        .eq("id", id)
}

export async function findOfficialsBySimilarity(
    supabase: DBClient,
    query: string
) {
    const { data, error } = await supabase.rpc('search_officials_with_similarity', {
        search_term: query.toLowerCase()
    });

    if (error) {
        return { data: null, error };
    }

    if (!data || data.length === 0) {
        return { data: [], error: null };
    }

    const results = data.slice(0, 5).map(official => ({
        id: official.id,
        roblox_user_id: official.roblox_user_id,
        username: official.username,
        display_name: official.display_name,
        avatar_url: official.avatar_url
    }));

    return { data: results, error: null };
}