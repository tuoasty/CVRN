"use server";

import { Err, Ok, Result } from "@/lib/result";
import {RobloxUser} from "@/lib/types/robloxUser";
import {robloxThumbnailsApi, robloxUsersApi} from "@/lib/api/roblox";
import {RobloxThumbnail} from "@/lib/types/robloxThumbnail";
import {serializeError} from "@/lib/error/serializeableError";

export async function findUsersByName(username: string): Promise<Result<RobloxUser[]>> {
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
        return Err(serializeError(error));
    }
}

export async function findAvatarsByIds(userIds: bigint[]): Promise<Result<RobloxThumbnail[]>>{
    try {
        const {data} = await robloxThumbnailsApi.get<{data: RobloxThumbnail[]}>(
            "/v1/users/avatar-headshot", {
                params:{
                    userIds:userIds.map(id => Number(id)).join(","),
                    size:"150x150",
                    format:"Png",
                    isCircular:false,
                },
            }
        );

        return Ok(data.data);
    } catch(error){
        return Err(serializeError(error));
    }
}