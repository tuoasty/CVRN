export interface RobloxUserIdInput {
    robloxUserId: string
}

export interface SavePlayerInput {
    robloxUserId: string
    username: string
    displayName?: string | null
    avatarUrl?: string | null
}

export interface UpdatePlayerInput {
    robloxUserId: string
    username?: string
    displayName?: string | null
    avatarUrl?: string | null
    lastSyncedAt?: string
}

export interface AddPlayerToTeamInput {
    playerId: string
    teamId: string
    seasonId: string
}

export interface RemovePlayerFromTeamInput {
    playerId: string
    seasonId: string
}

export interface TeamPlayersInput {
    teamId: string
    seasonId: string
}

export interface PlayerCurrentTeamInput {
    playerId: string
    seasonId: string
}

export interface SavePlayerToTeamInput {
    robloxUserId: string
    username: string
    displayName?: string | null
    avatarUrl?: string | null
    teamId: string
}

export interface PlayersByIdsInput {
    playerIds: string[]
}

export interface SearchPlayersInput {
    query: string
}

export interface PlayerWithTeamInfo {
    id: string
    roblox_user_id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
    current_team_id: string | null
    current_season_id: string | null
    current_team_name: string | null
}

export interface AddExistingPlayerToTeamInput {
    playerId: string
    teamId: string
}

export type PlayerRole = 'captain' | 'vice_captain' | 'court_captain' | 'player';

export interface PlayerWithRole {
    id: string;
    roblox_user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    last_synced_at: string | null;
    created_at: string;
    role: PlayerRole;
}

export interface SetPlayerRoleInput {
    playerId: string;
    teamId: string;
    seasonId: string;
    role: PlayerRole;
}

export interface TransferCaptainInput {
    currentCaptainPlayerId: string;
    newCaptainPlayerId: string;
    teamId: string;
    seasonId: string;
}