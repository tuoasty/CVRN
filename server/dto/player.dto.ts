export interface SavePlayerInput {
    robloxUserId:number;
    username:string;
    displayName?:string | null;
    avatarUrl?: string | null;
    teamId?: string | null;
}