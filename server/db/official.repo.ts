import {DBClient, Official} from "@/shared/types/db";
import {SaveOfficialInput, UpdateOfficialInput} from "@/server/domains/official";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

type OfficialSummary = Pick<Official, "id" | "roblox_user_id" | "username" | "display_name" | "avatar_url">;

export async function upsertOfficial(supabase: DBClient, p: SaveOfficialInput): Promise<Result<Official>> {
    const {data, error} = await supabase.from("officials")
        .upsert(
            {
                roblox_user_id: String(p.robloxUserId),
                username: p.username,
                avatar_url: p.avatarUrl ?? null,
                display_name: p.displayName ?? null,
                last_synced_at: new Date().toISOString()
            },
            {onConflict: "roblox_user_id"}
        )
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findOfficialByRobloxId(supabase: DBClient, robloxUserId: string): Promise<Result<Official | null>> {
    const {data, error} = await supabase.from("officials")
        .select("*")
        .eq("roblox_user_id", robloxUserId)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findAllOfficials(supabase: DBClient): Promise<Result<Official[]>> {
    const {data, error} = await supabase.from("officials")
        .select("*")
        .order("created_at", {ascending: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function updateOfficial(supabase: DBClient, p: UpdateOfficialInput): Promise<Result<Official>> {
    const updates: Record<string, unknown> = {};

    if (p.username !== undefined) updates.username = p.username;
    if (p.avatarUrl !== undefined) updates.avatar_url = p.avatarUrl;
    if (p.lastSyncedAt !== undefined) updates.last_synced_at = p.lastSyncedAt;
    if (p.displayName !== undefined) updates.display_name = p.displayName;

    const {data, error} = await supabase
        .from("officials")
        .update(updates)
        .eq("roblox_user_id", p.robloxUserId)
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function deleteOfficial(supabase: DBClient, id: string): Promise<Result<true>> {
    const {error} = await supabase.from("officials")
        .delete()
        .eq("id", id);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function findOfficialsBySimilarity(supabase: DBClient, query: string): Promise<Result<OfficialSummary[]>> {
    const {data, error} = await supabase.rpc('search_officials_with_similarity', {
        search_term: query.toLowerCase()
    });

    if (error) return Err(serializeError(error, "DB_ERROR"));
    if (!data || data.length === 0) return Ok([]);

    const results: OfficialSummary[] = data.slice(0, 5).map(official => ({
        id: official.id,
        roblox_user_id: official.roblox_user_id,
        username: official.username,
        display_name: official.display_name,
        avatar_url: official.avatar_url
    }));

    return Ok(results);
}

export async function findOfficialByExactUsername(supabase: DBClient, username: string): Promise<Result<OfficialSummary | null>> {
    const {data, error} = await supabase
        .from("officials")
        .select(`
            id,
            roblox_user_id,
            username,
            display_name,
            avatar_url
        `)
        .ilike("username", username)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}
