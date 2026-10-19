import {DBClient, Spec} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {logger} from "@/server/utils/logger";
import {findSpecById, updateSpecPhoto} from "@/server/db/specs.repo";
import {deleteFile, IMAGE_PROFILES, uploadFile} from "@/server/storage/storage.service";
import {BUCKETS, STORAGE_PATHS, extractStoragePath} from "@/server/storage/storage.paths";

export async function storeSpecPhoto(
    supabase: DBClient,
    p: {specId: string; file: File; userId: string}
): Promise<Result<Spec>> {
    const found = await findSpecById(supabase, p.specId);
    if (!found.ok) return found;
    if (!found.value) return Err({message: "Spec not found", code: "NOT_FOUND"});
    const previousUrl = found.value.photo_url;

    const uploaded = await uploadFile(supabase, {
        bucket: BUCKETS.PUBLIC,
        path: STORAGE_PATHS.specPhoto(p.specId),
        file: p.file,
        contentType: "image/webp",
        upsert: false,
        compress: true,
        removeBackground: false,
        profile: IMAGE_PROFILES.specPhoto,
        userId: p.userId,
    });
    if (!uploaded.ok) return uploaded;

    const updated = await updateSpecPhoto(supabase, p.specId, uploaded.value.url);
    if (!updated.ok) {
        await deleteFile(supabase, {bucket: BUCKETS.PUBLIC, path: uploaded.value.path});
        return updated;
    }

    if (previousUrl) {
        const removed = await deleteFile(supabase, {bucket: BUCKETS.PUBLIC, path: extractStoragePath(previousUrl, BUCKETS.PUBLIC)});
        if (!removed.ok) logger.warn({specId: p.specId, error: removed.error}, "storeSpecPhoto: old photo not deleted");
    }

    return Ok(updated.value);
}
