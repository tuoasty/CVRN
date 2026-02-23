import {RobloxUser} from "@/shared/types/roblox";

export interface SavePlayerInput {
    robloxUserId:string;
    username:string;
    displayName?:string | null;
    avatarUrl?: string | null;
    teamId?: string | null;
}

export interface GetTeamPlayers {
    teamId: string
}

export interface GetPlayerByRoblox {
    robloxUserId:string
}

export interface UpdatePlayerInput {
    robloxUserId: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    lastSyncedAt: string;
}
