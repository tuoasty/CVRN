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

export async function findPlayersByIds(
    supabase: DBClient,
    playerIds: string[]
) {
    return supabase
        .from("players")
        .select("*")
        .in("id", playerIds);
}

export async function findActivePlayerTeamSeasons(
    supabase: DBClient,
    playerIds: string[]
) {
    return supabase
        .from("player_team_seasons")
        .select("player_id, team_id")
        .in("player_id", playerIds)
        .is("left_at", null);
}

export async function findPlayersBySimilarity(
    supabase: DBClient,
    query: string
) {
    const { data, error } = await supabase.rpc('search_players_with_similarity', {
        search_term: query.toLowerCase()
    });

    if (error) {
        return { data: null, error };
    }

    if (!data || data.length === 0) {
        return { data: [], error: null };
    }

    const topPlayers = data.slice(0, 5);
    const playerIds = topPlayers.map(p => p.id);

    const { data: activeTeamSeasons, error: teamError } = await supabase
        .from("player_team_seasons")
        .select(`
            player_id, 
            team_id, 
            season_id,
            team:teams(name)
        `)
        .in("player_id", playerIds)
        .is("left_at", null);

    if (teamError) {
        return { data: null, error: teamError };
    }

    const teamMap = new Map(
        (activeTeamSeasons || []).map((pts: any) => [
            pts.player_id,
            {
                team_id: pts.team_id,
                season_id: pts.season_id,
                team_name: pts.team?.name || null
            }
        ])
    );

    const results = topPlayers.map(player => {
        const teamInfo = teamMap.get(player.id);
        return {
            id: player.id,
            roblox_user_id: player.roblox_user_id,
            username: player.username,
            display_name: player.display_name,
            avatar_url: player.avatar_url,
            current_team_id: teamInfo?.team_id || null,
            current_season_id: teamInfo?.season_id || null,
            current_team_name: teamInfo?.team_name || null
        };
    });

    return { data: results, error: null };
}

export async function findPlayerByExactUsername(
    supabase: DBClient,
    username: string
) {
    return supabase
        .from("players")
        .select(`
            id,
            roblox_user_id,
            username,
            display_name,
            avatar_url
        `)
        .ilike("username", username)
        .maybeSingle()
}

export async function setPlayerRole(
    supabase: DBClient,
    p: SetPlayerRoleInput
) {
    return supabase
        .from("player_team_seasons")
        .update({ role: p.role })
        .eq("player_id", p.playerId)
        .eq("team_id", p.teamId)
        .eq("season_id", p.seasonId)
        .is("left_at", null)
        .select()
        .single();
}

export async function countActivePlayersInTeam(
    supabase: DBClient,
    teamId: string,
    seasonId: string
) {
    return supabase
        .from("player_team_seasons")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("season_id", seasonId)
        .is("left_at", null);
}

export async function findPlayerByRole(
    supabase: DBClient,
    teamId: string,
    seasonId: string,
    role: PlayerRole
) {
    return supabase
        .from("player_team_seasons")
        .select("*")
        .eq("team_id", teamId)
        .eq("season_id", seasonId)
        .eq("role", role)
        .is("left_at", null)
        .maybeSingle();
}