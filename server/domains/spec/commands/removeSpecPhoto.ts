import {DBClient, Spec} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {logger} from "@/server/utils/logger";
import {findSpecById, updateSpecPhoto} from "@/server/db/specs.repo";
import {deleteFile} from "@/server/storage/storage.service";
import {BUCKETS, extractStoragePath} from "@/server/storage/storage.paths";

export async function removeSpecPhoto(supabase: DBClient, specId: string): Promise<Result<Spec>> {
    const found = await findSpecById(supabase, specId);
    if (!found.ok) return found;
    if (!found.value) return Err({message: "Spec not found", code: "NOT_FOUND"});
    const previousUrl = found.value.photo_url;
    if (!previousUrl) return Ok(found.value);

    const updated = await updateSpecPhoto(supabase, specId, null);
    if (!updated.ok) return updated;

    const removed = await deleteFile(supabase, {bucket: BUCKETS.PUBLIC, path: extractStoragePath(previousUrl, BUCKETS.PUBLIC)});
    if (!removed.ok) logger.warn({specId, error: removed.error}, "removeSpecPhoto: photo not deleted");

    return Ok(updated.value);
}
