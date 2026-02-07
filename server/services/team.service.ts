import {randomUUID} from "node:crypto";
import {BUCKETS, STORAGE_PATHS} from "@/server/storage/storage.paths";
import {getFileExtension} from "@/server/utils/fileExtension";
import {deleteFile, uploadFile} from "@/server/storage/storage.service";
import {Err, Ok, Result} from "@/shared/types/result";
import {insertTeam} from "@/server/db/teams.repo";
import {SerializableError, serializeError} from "@/server/utils/serializeableError";
import {Team} from "@/shared/types/db";

export async function createTeam(p:{
    name:string;
    logoFile:File
}):Promise<Result<Team, SerializableError>>{
    let uploadedPath: string | null = null
    let success = false;

    try {
        const teamId = randomUUID()
        const ext = getFileExtension(p.logoFile)
        const path = STORAGE_PATHS.teamLogo(teamId, ext);

        const uploadRes = await uploadFile({
            bucket: BUCKETS.PUBLIC,
            path,
            file:p.logoFile,
            contentType:p.logoFile.type
        });

        if(!uploadRes.ok){
            console.log(uploadRes)
            return Err({
                message:"Failed to upload team logo",
                name:"UploadError"
            });
        }

        uploadedPath = path
        const {data, error} = await insertTeam({
            id: teamId,
            name: p.name,
            logoUrl: uploadRes.value.url
        })
        if(error || !data){
            await deleteFile({
                bucket:BUCKETS.PUBLIC,
                path,
            })
        }
        if(error){
            return Err(serializeError(error))
        }
        if(!data) {
            return Err({
                message:"Failed to insert new team",
                name:"InsertError"
            })
        }

        success = true
        return Ok(data)
    } catch(error){
        return Err(serializeError(error))
    } finally {
        if(!success && uploadedPath){
            await deleteFile({
                bucket: BUCKETS.PUBLIC,
                path: uploadedPath
            })
        }
    }
}