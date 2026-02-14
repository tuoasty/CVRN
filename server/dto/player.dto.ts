import {RobloxUser} from "@/shared/types/roblox";

export interface SavePlayerInput {
    robloxUserId:number;
    username:string;
    displayName?:string | null;
    avatarUrl?: string | null;
    teamId?: string | null;
}

export interface GetTeamPlayers {
    teamId: string
}

export interface UpdatePlayerInput {
    user: RobloxUser,
    avatarUrl: string
}