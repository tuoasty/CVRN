"use server";

import {Err, Ok, Result} from "@/shared/types/result";
import {robloxThumbnailsApi, robloxUsersApi} from "@/server/roblox/client";
import {serializeError} from "@/server/utils/serializeableError";
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
        return Err(serializeError(error));
    }
}

export async function getRobloxAvatarsById(userIds: bigint[]): Promise<Result<RobloxThumbnail[]>>{
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