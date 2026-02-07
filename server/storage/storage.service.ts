import {Err, Ok, Result} from "@/shared/types/result";
import {SerializableError, serializeError} from "@/server/utils/serializeableError";
import {createClient} from "@/server/supabase/server";

export async function uploadFile(p: {
    bucket:string;
    path:string;
    file:File | Blob;
    contentType?:string;
    upsert?:boolean;
}): Promise<Result<{ url:string;path:string }, SerializableError>> {
    try {
        const supabase = await createClient();

        const {data, error} = await supabase.storage.from(p.bucket).upload(p.path, p.file, {
            contentType:p.contentType,
            upsert:p.upsert ?? true,
        });

        if(error){
            return Err(serializeError(error))
        }
        if(!data){
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
        return Err(serializeError(error))
    }
}

export async function deleteFile(p:{
    bucket:string;
    path:string
}): Promise<Result<null, SerializableError>>{
    try {
        const supabase = await createClient()
        const {error} = await supabase.storage.from(p.bucket).remove([p.path])
        if(error) {
            return Err(serializeError(error))
        }
        return Ok(null)
    } catch (error){
        return Err(serializeError(error))
    }
}

export async function createSignedUrl(p: {
    bucket:string;
    path:string;
    expiresIn:number;
}): Promise<Result<string, SerializableError>> {
    try {
        const supabase =  await createClient();
        const { data, error } = await supabase.storage
            .from(p.bucket)
            .createSignedUrl(p.path, p.expiresIn)

        if(error){
            return Err(serializeError(error))
        }
        if(!data){
            return Err({
                message:"Failed to create signed url",
                name:"SignedUrlFailure"
            });
        }

        return Ok(data.signedUrl)
    } catch (error) {
        return Err(serializeError(error))
    }
}