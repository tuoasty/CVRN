import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {DBClient} from "@/shared/types/db";
import {logger} from "@/server/utils/logger";

export async function uploadFile(supabase: DBClient, p: {
    bucket:string;
    path:string;
    file:File | Blob;
    contentType?:string;
    upsert?:boolean;
}): Promise<Result<{ url:string;path:string }>> {
    try {
        const {data, error} = await supabase.storage.from(p.bucket).upload(p.path, p.file, {
            contentType:p.contentType,
            upsert:p.upsert ?? true,
        });

        if(error){
            logger.error({bucket: p.bucket, path: p.path, contentType: p.contentType, error}, "Failed to upload file");
            return Err(serializeError(error))
        }
        if(!data){
            logger.error({bucket: p.bucket, path: p.path}, "Upload succeeded but no data returned");
            return Err({
                message:"Failed to insert data",
                name:"ImageInsertFailed"
            });
        }

        const { data: publicUrlData } = supabase.storage.from(p.bucket).getPublicUrl(data.path)
        return Ok({
            url:publicUrlData.publicUrl,
            path:data.path
        })
    } catch (error) {
        logger.error({error}, "Unexpected error uploading file");
        return Err(serializeError(error))
    }
}

export async function deleteFile(supabase: DBClient, p:{
    bucket:string;
    path:string
}): Promise<Result<null>>{
    try {
        const {error} = await supabase.storage.from(p.bucket).remove([p.path])
        if(error) {
            logger.error({bucket: p.bucket, path: p.path, error}, "Failed to delete file");
            return Err(serializeError(error))
        }
        return Ok(null)
    } catch (error){
        logger.error({error}, "Unexpected error deleting file");
        return Err(serializeError(error))
    }
}

export async function createSignedUrl(supabase: DBClient, p: {
    bucket:string;
    path:string;
    expiresIn:number;
}): Promise<Result<string>> {
    try {
        const { data, error } = await supabase.storage
            .from(p.bucket)
            .createSignedUrl(p.path, p.expiresIn)

        if(error){
            logger.error({bucket: p.bucket, path: p.path, expiresIn: p.expiresIn, error}, "Failed to create signed URL");
            return Err(serializeError(error))
        }
        if(!data){
            logger.error({bucket: p.bucket, path: p.path}, "Signed URL creation succeeded but no data returned");
            return Err({
                message:"Failed to create signed url",
                name:"SignedUrlFailure"
            });
        }

        return Ok(data.signedUrl)
    } catch (error) {
        logger.error({error}, "Unexpected error creating signed URL");
        return Err(serializeError(error))
    }
}