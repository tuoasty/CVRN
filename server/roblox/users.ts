"use server";

import {Err, Ok, Result} from "@/shared/types/result";
import {robloxThumbnailsApi, robloxUsersApi} from "@/server/roblox/client";
import {withBreaker} from "@/server/roblox/circuitBreaker";
import {logger} from "@/server/utils/logger";
import {RobloxThumbnail, RobloxUser} from "@/shared/types/roblox";

export async function getRobloxUserByName(username: string): Promise<Result<RobloxUser[]>> {
    return withBreaker(async () => {
        try {
            const {data} = await robloxUsersApi.post<{data: RobloxUser[]}>(
                `/v1/usernames/users`,
                {
                    usernames: [username],
                    excludeBannedUsers: true
                }
            );

            return Ok(data.data);
        } catch (error) {
            logger.error({error}, "Failed to fetch Roblox user by name");
            return Err({message: "Roblox API is temporarily unavailable", code: "INTEGRATION_ERROR"});
        }
    });
}

export async function getRobloxUsersById(userIds: string[]): Promise<Result<RobloxUser[]>> {
    return withBreaker(async () => {
        try {
            const {data} = await robloxUsersApi.post<{data: Array<{
                hasVerifiedBadge: boolean;
                id: number;
                name: string;
                displayName: string;
            }>}>(`/v1/users`, {
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
            logger.error({error, userIds}, "Failed to fetch Roblox users by ID");
            return Err({message: "Roblox API is temporarily unavailable", code: "INTEGRATION_ERROR"});
        }
    });
}

export async function getRobloxAvatarsById(userIds: string[]): Promise<Result<RobloxThumbnail[]>> {
    return withBreaker(async () => {
        try {
            const {data} = await robloxThumbnailsApi.get<{data: RobloxThumbnail[]}>(
                "/v1/users/avatar-headshot", {
                    params: {
                        userIds: userIds.join(","),
                        size: "180x180",
                        format: "Png",
                        isCircular: false,
                    },
                }
            );

            return Ok(data.data);
        } catch (error) {
            logger.error({error}, "Failed to fetch Roblox avatars by ID");
            return Err({message: "Roblox API is temporarily unavailable", code: "INTEGRATION_ERROR"});
        }
    });
}

export async function getRobloxLargeHeadshot(userId: string): Promise<Result<string | null>> {
    return withBreaker(async () => {
        try {
            const {data} = await robloxThumbnailsApi.get<{data: RobloxThumbnail[]}>(
                "/v1/users/avatar-headshot", {
                    params: {
                        userIds: userId,
                        size: "420x420",
                        format: "Png",
                        isCircular: false,
                    },
                }
            );

            const thumb = data.data[0];
            return Ok(thumb?.state === "Completed" ? thumb.imageUrl : null);
        } catch (error) {
            logger.error({error, userId}, "Failed to fetch large Roblox headshot");
            return Err({message: "Roblox API is temporarily unavailable", code: "INTEGRATION_ERROR"});
        }
    });
}

export async function getRobloxFullAvatarsById(userIds: string[]): Promise<Result<RobloxThumbnail[]>> {
    return withBreaker(async () => {
        try {
            const {data} = await robloxThumbnailsApi.get<{data: RobloxThumbnail[]}>(
                "/v1/users/avatar", {
                    params: {
                        userIds: userIds.join(","),
                        size: "420x420",
                        format: "Png",
                        isCircular: false,
                    },
                }
            );
            return Ok(data.data);
        } catch (error) {
            logger.error({error}, "Failed to fetch Roblox full avatars by ID");
            return Err({message: "Roblox API is temporarily unavailable", code: "INTEGRATION_ERROR"});
        }
    });
}
