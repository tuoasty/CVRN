import {randomUUID} from "node:crypto";
import {BUCKETS, STORAGE_PATHS} from "@/server/storage/storage.paths";
import {getFileExtension} from "@/server/utils/fileExtension";
import {deleteFile, uploadFile} from "@/server/storage/storage.service";
import {Err, Ok, Result} from "@/shared/types/result";
import {findAllTeams, findTeamByNameAndRegion, insertTeam} from "@/server/db/teams.repo";
import {SerializableError, serializeError} from "@/server/utils/serializeableError";
import {DBClient, Team} from "@/shared/types/db";
import {GetTeamByNameRegion} from "@/server/dto/team.dto";

export async function createTeam(supabase:DBClient, p:{
    name:string;
    logoFile:File;
    region:string;
}):Promise<Result<Team, SerializableError>>{
    let uploadedPath: string | null = null
    let success = false;

    try {
        const teamId = randomUUID()
        const ext = getFileExtension(p.logoFile)
        const path = STORAGE_PATHS.teamLogo(teamId, ext);

        const uploadRes = await uploadFile(supabase, {
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
        const {data, error} = await insertTeam(supabase, {
            id: teamId,
            name: p.name,
            logoUrl: uploadRes.value.url,
            region: p.region
        })
        if(error || !data){
            await deleteFile(supabase, {
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
            await deleteFile(supabase, {
                bucket: BUCKETS.PUBLIC,
                path: uploadedPath
            })
        }
    }
}

export async function getAllTeams(supabase: DBClient):Promise<Result<Team[]>> {
    try {
        const { data, error } = await findAllTeams(supabase)
        if(error){
            return Err(serializeError(error))
        }

        if(!data){
            return Err({
                message:"Failed to fetch teams",
                name:"FetchError"
            })
        }

        return Ok(data)
    } catch (error){
        return Err(serializeError(error))
    }
}

export async function getTeamByNameAndRegion(supabase: DBClient, p:GetTeamByNameRegion) {
    try {
        const { data, error } = await findTeamByNameAndRegion(supabase, p)
        if(error){
            return Err(serializeError(error))
        }

        if(!data){
            return Err({
                message:"Failed to fetch team",
                name:"FetchError"
            })
        }

        return Ok(data)
    } catch (error){
        return Err(serializeError(error))
    }
}