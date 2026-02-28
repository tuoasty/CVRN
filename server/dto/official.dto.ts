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