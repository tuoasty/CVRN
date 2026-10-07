import { getSupabaseAdmin } from '@/server/supabase/admin'
import { BUCKETS } from '@/server/storage/storage.paths'
import { deleteFile } from '@/server/storage/storage.service'
import { logger } from '@/server/utils/logger'

export async function deleteOwnedImageFiles(updateLogId: string, paths: string[]): Promise<void> {
    const prefix = `update-logs/${updateLogId}/`
    const admin = getSupabaseAdmin()
    for (const path of paths) {
        if (!path.startsWith(prefix)) {
            logger.warn({ updateLogId, path }, 'Refusing to delete storage path outside the update log folder')
            continue
        }
        const res = await deleteFile(admin, { bucket: BUCKETS.PUBLIC, path })
        if (!res.ok) {
            logger.warn({ updateLogId, path, error: res.error }, 'Failed to delete update log image file')
        }
    }
}
