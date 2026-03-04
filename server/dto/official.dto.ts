export interface SaveOfficialInput {
    robloxUserId: string;
    username: string;
    avatarUrl?: string | null;
    displayName?:string | null;
}

export interface UpdateOfficialInput {
    robloxUserId: string;
    username?: string;
    displayName?:string | null;
    avatarUrl?: string | null;
    lastSyncedAt?: string;
}

export interface OfficialWithInfo {
    id: string
    roblox_user_id: string
    username: string
    display_name: string | null
    avatar_url: string | null
}

export interface SearchOfficialsInput {
    query: string
}