import { randomUUID } from 'node:crypto'
import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { takeUpdateLogImageUpload } from '@/server/utils/rateLimiter'
import { getCurrentGroups } from '@/server/domains/auth/queries/getCurrentGroups'
import { findUpdateLogById } from '@/server/db/updateLog.repo'
import { findUpdateLogImagesByLogId, insertUpdateLogImage } from '@/server/db/updateLogImage.repo'
import { BUCKETS, STORAGE_PATHS } from '@/server/storage/storage.paths'
import { uploadFile } from '@/server/storage/storage.service'
import { UpdateLogAdminImage, UploadUpdateLogImageInput } from '../types'
import { deleteOwnedImageFiles } from '../helpers/deleteOwnedImageFiles'
import { toUpdateLogAdminImage } from '../helpers/toAdminShapes'

export async function uploadUpdateLogImage(supabase: DBClient, p: UploadUpdateLogImageInput): Promise<Result<UpdateLogAdminImage>> {
    try {
        const lookup = await findUpdateLogById(supabase, p.updateLogId)
        if (!lookup.ok) return lookup
        if (!lookup.value) return Err({ message: 'Update log not found', code: 'NOT_FOUND' })

        const existing = await findUpdateLogImagesByLogId(supabase, p.updateLogId)
        if (!existing.ok) return existing
        if (existing.value.some(img => img.handle === p.name)) {
            return Err({ message: 'Another image in this log already uses that name.', code: 'UPDATE_LOG_IMAGE_NAME_TAKEN' })
        }

        const groups = await getCurrentGroups(supabase)
        if (!groups.ok) return groups
        const limit = takeUpdateLogImageUpload(p.userId, groups.value.includes('super_admin') ? 'super_admin' : 'staff')
        if (!limit.allowed) {
            const resetAt = limit.resetAt ? new Date(limit.resetAt).toISOString() : 'later'
            return Err({ message: `Image upload limit reached. Try again after ${resetAt}.`, code: 'FORBIDDEN' })
        }

        const id = randomUUID()
        const path = STORAGE_PATHS.updateLogImage(p.updateLogId, id, 'webp')
        const uploaded = await uploadFile(supabase, {
            bucket:      BUCKETS.PUBLIC,
            path,
            file:        p.file,
            contentType: 'image/webp',
            upsert:      false,
            userId:      p.userId,
        })
        if (!uploaded.ok) return Err({ message: 'Failed to upload image', code: 'INTEGRATION_ERROR' })

        const inserted = await insertUpdateLogImage(supabase, {
            id,
            update_log_id: p.updateLogId,
            handle:        p.name,
            storage_path:  uploaded.value.path,
            url:           uploaded.value.url,
            caption:       p.caption,
        })
        if (!inserted.ok) {
            await deleteOwnedImageFiles(p.updateLogId, [uploaded.value.path])
            return inserted
        }

        return Ok(toUpdateLogAdminImage(inserted.value))
    } catch (error) {
        return Err(serializeError(error))
    }
}
