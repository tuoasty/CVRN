"use server";

import {Err, Ok, Result} from "@/shared/types/result";
import {robloxThumbnailsApi, robloxUsersApi} from "@/server/roblox/client";
import {logger} from "@/server/utils/logger";
import {RobloxThumbnail, RobloxUser} from "@/shared/types/roblox";

export async function getRobloxUserByName(username: string): Promise<Result<RobloxUser[]>> {
    try {
        const {data} = await robloxUsersApi.post<{data: RobloxUser[]}>(
            `/v1/usernames/users`,
            {
                usernames: [username],
                excludeBannedUsers: true
            }
        );

        return Ok(data.data);
    } catch (error){
        logger.error({ error }, "Failed to fetch Roblox user by name");
        return Err({ message: "Roblox API is temporarily unavailable", code: "INTEGRATION_ERROR" });
    }
}

export async function getRobloxUsersById(userIds: string[]): Promise<Result<RobloxUser[]>> {
    try {
        const { data } = await robloxUsersApi.post<{ data: Array<{
            hasVerifiedBadge: boolean;
            id: number;
            name: string;
            displayName: string;
        }> }>(`/v1/users`, {
            userIds: userIds.map(Number),
            excludeBannedUsers: false,
        });

        return Ok(data.data.map(u => ({
            requestedUsername: u.name,
            hasVerifiedBadge: u.hasVerifiedBadge,
            id: String(u.id),
            name: u.name,
            displayName: u.displayName,
        })));
    } catch (error) {
        logger.error({ error, userIds }, "Failed to fetch Roblox users by ID");
        return Err({ message: "Roblox API is temporarily unavailable", code: "INTEGRATION_ERROR" });
    }
}

export async function getRobloxAvatarsById(userIds: string[]): Promise<Result<RobloxThumbnail[]>>{
    try {
        const {data} = await robloxThumbnailsApi.get<{data: RobloxThumbnail[]}>(
            "/v1/users/avatar-headshot", {
                params:{
                    userIds: userIds.join(","),
                    size:"150x150",
                    format:"Png",
                    isCircular:false,
                },
            }
        );

        return Ok(data.data);
    } catch(error){
        logger.error({ error }, "Failed to fetch Roblox avatars by ID");
        return Err({ message: "Roblox API is temporarily unavailable", code: "INTEGRATION_ERROR" });
    }
}