export interface RobloxUserIdInput {
    robloxUserId:string
}

export interface SavePlayerInput {
    robloxUserId:string;
    username:string;
    displayName?:string | null;
    avatarUrl?: string | null;
    teamId?: string | null;
}

export interface UpdatePlayerInput {
    robloxUserId: string
    username?: string
    displayName?: string | null
    avatarUrl?: string | null
    lastSyncedAt?: string
    teamId?: string | null
}
