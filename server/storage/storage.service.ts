import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";
import {DBClient} from "@/shared/types/db";
import {logger} from "@/server/utils/logger";
import sharp from 'sharp';
import {getUserRole} from "@/server/db/roles.repo";
import {checkUploadRateLimit} from "@/server/utils/rateLimiter";

const IMAGE_VALIDATION = {
    MAX_FILE_SIZE: 2 * 1024 * 1024,
    MAX_DIMENSION: 512,
    ALLOWED_TYPES: ['image/png', 'image/jpeg', 'image/webp'] as string[],
    COMPRESSION_QUALITY: 85,
} as const;

async function validateAndCompressImage(file: File | Blob): Promise<Result<{ buffer: Buffer; contentType: string }>> {
    try {
        if (file.size > IMAGE_VALIDATION.MAX_FILE_SIZE) {
            return Err({
                message: `File size exceeds ${IMAGE_VALIDATION.MAX_FILE_SIZE / 1024 / 1024}MB`,
                name: "FileSizeExceeded",
                code: "VALIDATION_ERROR"
            });
        }

        const fileType = file instanceof File ? file.type : 'unknown';
        if (fileType !== 'unknown' && !IMAGE_VALIDATION.ALLOWED_TYPES.includes(fileType)) {
            return Err({
                message: `Invalid file type. Allowed: ${IMAGE_VALIDATION.ALLOWED_TYPES.join(', ')}`,
                name: "InvalidFileType",
                code: "VALIDATION_ERROR"
            });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const image = sharp(buffer);
        const metadata = await image.metadata();

        if (!metadata.width || !metadata.height) {
            return Err({
                message: "Unable to read image dimensions",
                name: "InvalidImage",
                code: "VALIDATION_ERROR"
            });
        }

        const resized = image.resize(IMAGE_VALIDATION.MAX_DIMENSION, IMAGE_VALIDATION.MAX_DIMENSION, {
            fit: 'inside',
            withoutEnlargement: true
        });

        let compressed: Buffer;
        let outputType: string;

        if (metadata.format === 'png') {
            compressed = await resized.png({ quality: IMAGE_VALIDATION.COMPRESSION_QUALITY }).toBuffer();
            outputType = 'image/png';
        } else if (metadata.format === 'webp') {
            compressed = await resized.webp({ quality: IMAGE_VALIDATION.COMPRESSION_QUALITY }).toBuffer();
            outputType = 'image/webp';
        } else {
            compressed = await resized.jpeg({ quality: IMAGE_VALIDATION.COMPRESSION_QUALITY }).toBuffer();
            outputType = 'image/jpeg';
        }

        return Ok({ buffer: compressed, contentType: outputType });
    } catch (error) {
        logger.error({ error }, "Failed to validate and compress image");
        return Err({
            message: "Failed to process image",
            name: "ImageProcessingError",
            code: "INTEGRATION_ERROR"
        });
    }
}

export async function uploadFile(supabase: DBClient, p: {
    bucket:string;
    path:string;
    file:File | Blob;
    contentType?:string;
    upsert?:boolean;
    compress?: boolean;
    userId: string;
}): Promise<Result<{ url:string;path:string }>> {
    try {
        const roleResult = await getUserRole(supabase, p.userId);
        if (!roleResult.ok) {
            return Err(roleResult.error);
        }

        const role = roleResult.value || 'admin';
        const rateLimitCheck = checkUploadRateLimit(p.userId, role);

        if (!rateLimitCheck.allowed) {
            const resetDate = new Date(rateLimitCheck.resetAt!);
            logger.warn({ userId: p.userId, resetAt: resetDate }, "Upload rate limit exceeded");
            return Err({
                message: `Upload rate limit exceeded. Try again after ${resetDate.toISOString()}`,
                name: "RateLimitExceeded",
                code: "FORBIDDEN"
            });
        }

        let fileToUpload: File | Blob | Buffer = p.file;
        let contentType = p.contentType;

        if (p.compress) {
            const compressionResult = await validateAndCompressImage(p.file);
            if (!compressionResult.ok) {
                return Err(compressionResult.error);
            }
            fileToUpload = compressionResult.value.buffer;
            contentType = compressionResult.value.contentType;
        }

        const {data, error} = await supabase.storage.from(p.bucket).upload(p.path, fileToUpload, {
            contentType: contentType,
            upsert: p.upsert ?? true,
        });

        if(error){
            logger.error({bucket: p.bucket, path: p.path, contentType: contentType, error}, "Failed to upload file");
            return Err(serializeError(error, "DB_ERROR"))
        }
        if(!data){
            logger.error({bucket: p.bucket, path: p.path}, "Upload succeeded but no data returned");
            return Err({
                message:"Failed to insert data",
                name:"ImageInsertFailed",
                code:"DB_ERROR"
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
            return Err(serializeError(error, "DB_ERROR"))
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
            return Err(serializeError(error, "DB_ERROR"))
        }
        if(!data){
            logger.error({bucket: p.bucket, path: p.path}, "Signed URL creation succeeded but no data returned");
            return Err({
                message:"Failed to create signed url",
                name:"SignedUrlFailure",
                code:"DB_ERROR"
            });
        }

        return Ok(data.signedUrl)
    } catch (error) {
        logger.error({error}, "Unexpected error creating signed URL");
        return Err(serializeError(error))
    }
}