import {DBClient, Player, PlayerTeamSeason} from "@/shared/types/db";
import {
    SavePlayerInput,
    UpdatePlayerInput,
    AddPlayerToTeamInput,
    RemovePlayerFromTeamInput,
    SetPlayerRoleInput, PlayerRole
} from "@/server/domains/player";
import {Database} from "@/database.types";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

type PlayerTeamSeasonWithPlayer = PlayerTeamSeason & {player: Player | null};
type PlayerTeamSeasonWithRefs = PlayerTeamSeason & {
    team: Database["public"]["Tables"]["teams"]["Row"] | null;
    season: Database["public"]["Tables"]["seasons"]["Row"] | null;
};
type PlayerSummary = Pick<Player, "id" | "roblox_user_id" | "username" | "display_name" | "avatar_url">;
type PlayerSearchResult = PlayerSummary & {
    current_team_id: string | null;
    current_season_id: string | null;
    current_team_name: string | null;
};

export async function upsertPlayer(supabase: DBClient, p: SavePlayerInput): Promise<Result<Player>> {
    const {data, error} = await supabase.from("players")
        .upsert(
            {
                roblox_user_id: String(p.robloxUserId),
                username: p.username,
                display_name: p.displayName ?? null,
                avatar_url: p.avatarUrl ?? null,
                last_synced_at: new Date().toISOString()
            },
            {onConflict: "roblox_user_id"}
        )
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findPlayerByRobloxId(supabase: DBClient, robloxUserId: string): Promise<Result<Player | null>> {
    const {data, error} = await supabase.from("players")
        .select("*")
        .eq("roblox_user_id", robloxUserId)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findPlayerById(supabase: DBClient, playerId: string): Promise<Result<Player | null>> {
    const {data, error} = await supabase.from("players")
        .select("*")
        .eq("id", playerId)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findAllTeamPlayers(
    supabase: DBClient,
    teamId: string,
    seasonId: string
): Promise<Result<PlayerTeamSeasonWithPlayer[]>> {
    const {data, error} = await supabase
        .from("player_team_seasons")
        .select(`
            *,
            player:players(*)
        `)
        .eq("team_id", teamId)
        .eq("season_id", seasonId)
        .is("left_at", null);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as PlayerTeamSeasonWithPlayer[]);
}

export async function findPlayerCurrentTeam(
    supabase: DBClient,
    playerId: string,
    seasonId: string
): Promise<Result<PlayerTeamSeason | null>> {
    const {data, error} = await supabase
        .from("player_team_seasons")
        .select("*")
        .eq("player_id", playerId)
        .eq("season_id", seasonId)
        .is("left_at", null)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function addPlayerToTeam(supabase: DBClient, p: AddPlayerToTeamInput): Promise<Result<PlayerTeamSeason>> {
    const {data, error} = await supabase
        .from("player_team_seasons")
        .insert({
            player_id: p.playerId,
            team_id: p.teamId,
            season_id: p.seasonId,
            joined_at: new Date().toISOString()
        })
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function removePlayerFromTeam(supabase: DBClient, p: RemovePlayerFromTeamInput): Promise<Result<PlayerTeamSeason>> {
    const {data, error} = await supabase
        .from("player_team_seasons")
        .update({left_at: new Date().toISOString()})
        .eq("player_id", p.playerId)
        .eq("season_id", p.seasonId)
        .is("left_at", null)
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findPlayerSeasonHistory(
    supabase: DBClient,
    playerId: string
): Promise<Result<PlayerTeamSeasonWithRefs[]>> {
    const {data, error} = await supabase
        .from("player_team_seasons")
        .select(`
            *,
            team:teams(*),
            season:seasons(*)
        `)
        .eq("player_id", playerId)
        .order("joined_at", {ascending: false});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok((data ?? []) as unknown as PlayerTeamSeasonWithRefs[]);
}

export async function updatePlayer(supabase: DBClient, p: UpdatePlayerInput): Promise<Result<Player>> {
    const updates: Record<string, unknown> = {};

    if (p.username !== undefined) updates.username = p.username;
    if (p.displayName !== undefined) updates.display_name = p.displayName;
    if (p.avatarUrl !== undefined) updates.avatar_url = p.avatarUrl;
    if (p.lastSyncedAt !== undefined) updates.last_synced_at = p.lastSyncedAt;

    const {data, error} = await supabase
        .from("players")
        .update(updates)
        .eq("roblox_user_id", p.robloxUserId)
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function findPlayersByIds(supabase: DBClient, playerIds: string[]): Promise<Result<Player[]>> {
    const {data, error} = await supabase
        .from("players")
        .select("*")
        .in("id", playerIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findActivePlayerTeamSeasons(
    supabase: DBClient,
    playerIds: string[]
): Promise<Result<{player_id: string; team_id: string}[]>> {
    const {data, error} = await supabase
        .from("player_team_seasons")
        .select("player_id, team_id")
        .in("player_id", playerIds)
        .is("left_at", null);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findPlayersBySimilarity(supabase: DBClient, query: string): Promise<Result<PlayerSearchResult[]>> {
    const {data, error} = await supabase.rpc('search_players_with_similarity', {
        search_term: query.toLowerCase()
    });

    if (error) return Err(serializeError(error, "DB_ERROR"));
    if (!data || data.length === 0) return Ok([]);

    const topPlayers = data.slice(0, 5);
    const playerIds = topPlayers.map(p => p.id);

    const {data: activeTeamSeasons, error: teamError} = await supabase
        .from("player_team_seasons")
        .select(`
            player_id,
            team_id,
            season_id,
            team:teams(name)
        `)
        .in("player_id", playerIds)
        .is("left_at", null);

    if (teamError) return Err(serializeError(teamError, "DB_ERROR"));

    const teamMap = new Map(
        (activeTeamSeasons || []).map(pts => [
            pts.player_id,
            {
                team_id: pts.team_id,
                season_id: pts.season_id,
                team_name: pts.team?.name || null
            }
        ])
    );

    const results: PlayerSearchResult[] = topPlayers.map(player => {
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

    return Ok(results);
}

export async function findPlayerByExactUsername(supabase: DBClient, username: string): Promise<Result<PlayerSummary | null>> {
    const {data, error} = await supabase
        .from("players")
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

export async function setPlayerRole(supabase: DBClient, p: SetPlayerRoleInput): Promise<Result<PlayerTeamSeason>> {
    const {data, error} = await supabase
        .from("player_team_seasons")
        .update({role: p.role})
        .eq("player_id", p.playerId)
        .eq("team_id", p.teamId)
        .eq("season_id", p.seasonId)
        .is("left_at", null)
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function countActivePlayersInTeam(
    supabase: DBClient,
    teamId: string,
    seasonId: string
): Promise<Result<number>> {
    const {count, error} = await supabase
        .from("player_team_seasons")
        .select("id", {count: "exact", head: true})
        .eq("team_id", teamId)
        .eq("season_id", seasonId)
        .is("left_at", null);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(count ?? 0);
}

export async function findPlayerByRole(
    supabase: DBClient,
    teamId: string,
    seasonId: string,
    role: PlayerRole
): Promise<Result<PlayerTeamSeason | null>> {
    const {data, error} = await supabase
        .from("player_team_seasons")
        .select("*")
        .eq("team_id", teamId)
        .eq("season_id", seasonId)
        .eq("role", role)
        .is("left_at", null)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}
