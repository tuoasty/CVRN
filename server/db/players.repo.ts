import {DBClient} from "@/shared/types/db";
import {SavePlayerInput, UpdatePlayerInput, AddPlayerToTeamInput, RemovePlayerFromTeamInput} from "@/server/dto/player.dto";

export async function upsertPlayer(
    supabase: DBClient,
    p: SavePlayerInput
) {
    return supabase.from("players")
        .upsert(
            {
                roblox_user_id: String(p.robloxUserId),
                username: p.username,
                display_name: p.displayName ?? null,
                avatar_url: p.avatarUrl ?? null,
                last_synced_at: new Date().toISOString()
            },
            {
                onConflict: "roblox_user_id",
            }
        )
        .select()
        .single()
}

export async function findPlayerByRobloxId(
    supabase: DBClient,
    robloxUserId: string
) {
    return supabase.from("players")
        .select("*")
        .eq("roblox_user_id", robloxUserId)
        .maybeSingle()
}

export async function findPlayerById(
    supabase: DBClient,
    playerId: string
) {
    return supabase.from("players")
        .select("*")
        .eq("id", playerId)
        .maybeSingle()
}

export async function findAllTeamPlayers(
    supabase: DBClient,
    teamId: string,
    seasonId: string
) {
    return supabase
        .from("player_team_seasons")
        .select(`
            *,
            player:players(*)
        `)
        .eq("team_id", teamId)
        .eq("season_id", seasonId)
        .is("left_at", null)
}

export async function findPlayerCurrentTeam(
    supabase: DBClient,
    playerId: string,
    seasonId: string
) {
    return supabase
        .from("player_team_seasons")
        .select("*")
        .eq("player_id", playerId)
        .eq("season_id", seasonId)
        .is("left_at", null)
        .maybeSingle()
}

export async function addPlayerToTeam(
    supabase: DBClient,
    p: AddPlayerToTeamInput
) {
    return supabase
        .from("player_team_seasons")
        .insert({
            player_id: p.playerId,
            team_id: p.teamId,
            season_id: p.seasonId,
            joined_at: new Date().toISOString()
        })
        .select()
        .single()
}

export async function removePlayerFromTeam(
    supabase: DBClient,
    p: RemovePlayerFromTeamInput
) {
    return supabase
        .from("player_team_seasons")
        .update({
            left_at: new Date().toISOString()
        })
        .eq("player_id", p.playerId)
        .eq("season_id", p.seasonId)
        .is("left_at", null)
        .select()
        .single()
}

export async function findPlayerSeasonHistory(
    supabase: DBClient,
    playerId: string
) {
    return supabase
        .from("player_team_seasons")
        .select(`
            *,
            team:teams(*),
            season:seasons(*)
        `)
        .eq("player_id", playerId)
        .order("joined_at", { ascending: false })
}

export async function updatePlayer(
    supabase: DBClient,
    p: UpdatePlayerInput
) {
    const updates: Record<string, unknown> = {}

    if (p.username !== undefined) updates.username = p.username
    if (p.displayName !== undefined) updates.display_name = p.displayName
    if (p.avatarUrl !== undefined) updates.avatar_url = p.avatarUrl
    if (p.lastSyncedAt !== undefined) updates.last_synced_at = p.lastSyncedAt

    return supabase
        .from("players")
        .update(updates)
        .eq("roblox_user_id", p.robloxUserId)
        .select()
        .single()
}