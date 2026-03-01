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