import {DBClient, Player, PlayerTeamSeason} from "@/shared/types/db";
import {
    SavePlayerInput,
    UpdatePlayerInput,
    AddPlayerToTeamInput,
    RemovePlayerFromTeamInput,
    SetPlayerRoleInput,
    SetPlayerPositionInput,
    SetPlayerHeightInput,
    PlayerRole
} from "@/server/domains/player";
import type {PlayerSearchHit} from "@/server/domains/player/types";
import {Database} from "@/database.types";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {logger} from "@/server/utils/logger";
import {isActiveStint, pickActiveTeam, type RegionSets} from "@/server/domains/player/helpers/pickMainTeam";

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
    season_team_id: string | null;
    season_team_name: string | null;
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

export async function findAllTeamPlayersForSeason(
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
        .eq("season_id", seasonId);
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

export async function addPlayerToTeam(supabase: DBClient, p: AddPlayerToTeamInput & {role?: PlayerRole}): Promise<Result<PlayerTeamSeason>> {
    const {data, error} = await supabase
        .from("player_team_seasons")
        .insert({
            player_id: p.playerId,
            team_id: p.teamId,
            season_id: p.seasonId,
            joined_at: new Date().toISOString(),
            ...(p.role && {role: p.role}),
            ...(p.position != null && {position: p.position}),
            ...(p.height != null && {height: p.height}),
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

export async function clearSeasonRosters(supabase: DBClient, seasonId: string): Promise<Result<true>> {
    const {error} = await supabase
        .from("player_team_seasons")
        .delete()
        .eq("season_id", seasonId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function bulkRemovePlayersFromTeam(
    supabase: DBClient,
    seasonId: string,
    playerIds: string[]
): Promise<Result<void>> {
    if (playerIds.length === 0) return Ok(undefined);
    const {error} = await supabase
        .from("player_team_seasons")
        .update({left_at: new Date().toISOString()})
        .in("player_id", playerIds)
        .eq("season_id", seasonId)
        .is("left_at", null);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(undefined);
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

export type BulkPlayerUpdate = {
    robloxUserId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    lastSyncedAt?: string;
};

export async function hardDeletePlayerTeamSeason(supabase: DBClient, ptsId: string): Promise<Result<true>> {
    const {error} = await supabase
        .from("player_team_seasons")
        .delete()
        .eq("id", ptsId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function restorePlayerTeamSeason(supabase: DBClient, ptsId: string): Promise<Result<true>> {
    const {error} = await supabase
        .from("player_team_seasons")
        .update({left_at: null})
        .eq("id", ptsId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function restorePlayerRole(
    supabase: DBClient,
    playerId: string,
    teamId: string,
    role: string
): Promise<Result<true>> {
    const {error} = await supabase
        .from("player_team_seasons")
        .update({role})
        .eq("player_id", playerId)
        .eq("team_id", teamId)
        .is("left_at", null);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}

export async function updatePlayersBulk(
    supabase: DBClient,
    updates: BulkPlayerUpdate[]
): Promise<Result<Player[]>> {
    if (updates.length === 0) return Ok([]);

    const rows = updates.map(u => {
        const row: {
            roblox_user_id: string;
            username: string;
            display_name: string | null;
            avatar_url: string | null;
            last_synced_at?: string;
        } = {
            roblox_user_id: u.robloxUserId,
            username: u.username,
            display_name: u.displayName,
            avatar_url: u.avatarUrl
        };
        if (u.lastSyncedAt !== undefined) row.last_synced_at = u.lastSyncedAt;
        return row;
    });

    logger.info({rowsCount: rows.length}, "updatePlayersBulk: about to upsert");
    const {data, error, status, statusText} = await supabase
        .from("players")
        .upsert(rows, {onConflict: "roblox_user_id"})
        .select();
    if (error) {
        logger.error({error, status, statusText, rowsCount: rows.length}, "updatePlayersBulk: upsert failed");
        return Err(serializeError(error, "DB_ERROR"));
    }
    logger.info({status, returnedCount: data?.length ?? 0, sentCount: rows.length}, "updatePlayersBulk: upsert response");
    return Ok(data ?? []);
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

export async function findPlayerTeamSeasonsForTeams(
    supabase: DBClient,
    playerIds: string[],
    teamIds: string[],
    seasonId: string
): Promise<Result<{player_id: string; team_id: string}[]>> {
    if (playerIds.length === 0) return Ok([]);
    const {data, error} = await supabase
        .from("player_team_seasons")
        .select("player_id, team_id")
        .in("player_id", playerIds)
        .in("team_id", teamIds)
        .eq("season_id", seasonId);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findPlayersBySimilarity(supabase: DBClient, query: string, seasonId?: string): Promise<Result<PlayerSearchResult[]>> {
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

    const seasonTeamMap = new Map<string, {team_id: string; team_name: string | null}>();
    if (seasonId) {
        const {data: seasonTeamSeasons, error: seasonTeamError} = await supabase
            .from("player_team_seasons")
            .select(`
                player_id,
                team_id,
                team:teams(name)
            `)
            .in("player_id", playerIds)
            .eq("season_id", seasonId);

        if (seasonTeamError) return Err(serializeError(seasonTeamError, "DB_ERROR"));

        for (const pts of seasonTeamSeasons ?? []) {
            seasonTeamMap.set(pts.player_id, {
                team_id: pts.team_id,
                team_name: pts.team?.name || null
            });
        }
    }

    const results: PlayerSearchResult[] = topPlayers.map(player => {
        const teamInfo = teamMap.get(player.id);
        const seasonTeamInfo = seasonTeamMap.get(player.id);
        return {
            id: player.id,
            roblox_user_id: player.roblox_user_id,
            username: player.username,
            display_name: player.display_name,
            avatar_url: player.avatar_url,
            current_team_id: teamInfo?.team_id || null,
            current_season_id: teamInfo?.season_id || null,
            current_team_name: teamInfo?.team_name || null,
            season_team_id: seasonTeamInfo?.team_id || null,
            season_team_name: seasonTeamInfo?.team_name || null
        };
    });

    return Ok(results);
}

const SEARCH_RESULT_LIMIT = 20;

const RECENT_STINT_SCAN = 300;

type SearchStintRow = {
    player_id: string;
    joined_at: string;
    left_at: string | null;
    team: {id: string; name: string; logo_url: string | null; logo_bg_removed: boolean; brick_color: string | null} | null;
    season: {id: string; name: string; league_type: "main" | "side"; start_date: string; end_date: string | null; region: {code: string; name: string} | null} | null;
};

type SearchStint = {
    season_id: string;
    season_name: string;
    region_code: string;
    region: {code: string; name: string} | null;
    league_type: "main" | "side";
    joined_at: string;
    left_at: string | null;
    season_start_date: string;
    season_end_date: string | null;
    team: NonNullable<SearchStintRow["team"]>;
};

type SearchBaseRow = {
    id: string;
    roblox_user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
};

async function findRegionSetsByPlayer(supabase: DBClient, playerIds: string[]): Promise<Result<Map<string, RegionSets[]>>> {
    const setsByPlayer = new Map<string, RegionSets[]>();
    if (playerIds.length === 0) return Ok(setsByPlayer);

    const {data, error} = await supabase
        .from("v_player_leaderboard")
        .select("player_id, season_id, region_code, sets_played")
        .in("player_id", playerIds);
    if (error) return Err(serializeError(error, "DB_ERROR"));

    for (const row of data ?? []) {
        if (!row.player_id || !row.season_id) continue;
        const rows = setsByPlayer.get(row.player_id) ?? [];
        rows.push({season_id: row.season_id, region_code: row.region_code ?? "", sets_played: row.sets_played});
        setsByPlayer.set(row.player_id, rows);
    }
    return Ok(setsByPlayer);
}

async function enrichPlayerHits(supabase: DBClient, base: SearchBaseRow[]): Promise<Result<PlayerSearchHit[]>> {
    if (base.length === 0) return Ok([]);
    const playerIds = base.map(p => p.id);

    const {data: stints, error: stintError} = await supabase
        .from("player_team_seasons")
        .select(`
            player_id,
            joined_at,
            left_at,
            team:teams!team_id(id, name, logo_url, logo_bg_removed, brick_color),
            season:seasons!season_id(id, name, league_type, start_date, end_date, region:regions!region_id(code, name))
        `)
        .in("player_id", playerIds)
        .order("joined_at", {ascending: false});

    if (stintError) return Err(serializeError(stintError, "DB_ERROR"));

    const latestRegionByPlayer = new Map<string, {code: string; name: string} | null>();
    const stintsByPlayer = new Map<string, SearchStint[]>();

    for (const row of (stints ?? []) as SearchStintRow[]) {
        if (!latestRegionByPlayer.has(row.player_id)) {
            latestRegionByPlayer.set(row.player_id, row.season?.region ?? null);
        }
        if (!row.team || !row.season) continue;
        const playerStints = stintsByPlayer.get(row.player_id) ?? [];
        playerStints.push({
            season_id: row.season.id,
            season_name: row.season.name,
            region_code: row.season.region?.code ?? "",
            region: row.season.region,
            league_type: row.season.league_type,
            joined_at: row.joined_at,
            left_at: row.left_at,
            season_start_date: row.season.start_date,
            season_end_date: row.season.end_date,
            team: row.team,
        });
        stintsByPlayer.set(row.player_id, playerStints);
    }

    const now = new Date();
    const multiTeamIds = playerIds.filter(id => (stintsByPlayer.get(id) ?? []).filter(s => isActiveStint(s, now)).length > 1);
    const setsResult = await findRegionSetsByPlayer(supabase, multiTeamIds);
    if (!setsResult.ok) return setsResult;

    const results: PlayerSearchHit[] = base.map(p => {
        const picked = pickActiveTeam(stintsByPlayer.get(p.id) ?? [], setsResult.value.get(p.id) ?? [], now);
        const region = picked?.region ?? latestRegionByPlayer.get(p.id) ?? null;
        return {
            id: p.id,
            roblox_user_id: p.roblox_user_id,
            username: p.username,
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            region_code: region?.code ?? null,
            region_name: region?.name ?? null,
            team: picked ? {
                id: picked.team.id,
                name: picked.team.name,
                logo_url: picked.team.logo_url,
                logo_bg_removed: picked.team.logo_bg_removed,
                brick_color: picked.team.brick_color,
                season_name: picked.season_name,
                joined_at: picked.joined_at,
            } : null,
        };
    });

    return Ok(results);
}

export async function findPlayersForSearch(supabase: DBClient, query: string): Promise<Result<PlayerSearchHit[]>> {
    const {data, error} = await supabase.rpc('search_players_with_similarity', {
        search_term: query.toLowerCase()
    });

    if (error) return Err(serializeError(error, "DB_ERROR"));
    if (!data || data.length === 0) return Ok([]);

    const topPlayers = data.slice(0, SEARCH_RESULT_LIMIT);
    return enrichPlayerHits(supabase, topPlayers);
}

export async function findRecentPlayers(supabase: DBClient, limit = SEARCH_RESULT_LIMIT): Promise<Result<PlayerSearchHit[]>> {
    const {data: recent, error} = await supabase
        .from("player_team_seasons")
        .select("player_id")
        .order("joined_at", {ascending: false})
        .limit(RECENT_STINT_SCAN);
    if (error) return Err(serializeError(error, "DB_ERROR"));

    const orderedIds: string[] = [];
    const seen = new Set<string>();
    for (const r of recent ?? []) {
        if (seen.has(r.player_id)) continue;
        seen.add(r.player_id);
        orderedIds.push(r.player_id);
        if (orderedIds.length >= limit) break;
    }
    if (orderedIds.length === 0) return Ok([]);

    const {data: players, error: pErr} = await supabase
        .from("players")
        .select("id, roblox_user_id, username, display_name, avatar_url")
        .in("id", orderedIds);
    if (pErr) return Err(serializeError(pErr, "DB_ERROR"));

    const byId = new Map((players ?? []).map(p => [p.id, p]));
    const base = orderedIds.map(id => byId.get(id)).filter(Boolean) as SearchBaseRow[];
    return enrichPlayerHits(supabase, base);
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

export async function findPlayersByUsernames(
    supabase: DBClient,
    usernames: string[]
): Promise<Result<PlayerSummary[]>> {
    if (usernames.length === 0) return Ok([]);
    const orClause = usernames.map(u => `username.ilike.${u}`).join(",");
    const {data, error} = await supabase
        .from("players")
        .select(`
            id,
            roblox_user_id,
            username,
            display_name,
            avatar_url
        `)
        .or(orClause);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
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

export async function setPlayerPosition(supabase: DBClient, p: SetPlayerPositionInput): Promise<Result<PlayerTeamSeason>> {
    const {data, error} = await supabase
        .from("player_team_seasons")
        .update({position: p.position})
        .eq("player_id", p.playerId)
        .eq("team_id", p.teamId)
        .eq("season_id", p.seasonId)
        .is("left_at", null)
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function setPlayerHeight(supabase: DBClient, p: SetPlayerHeightInput): Promise<Result<PlayerTeamSeason>> {
    const {data, error} = await supabase
        .from("player_team_seasons")
        .update({height: p.height})
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
