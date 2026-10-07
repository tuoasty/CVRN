import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { findUpdateLogById, deleteUpdateLogById } from '@/server/db/updateLog.repo'
import { findUpdateLogImagesByLogId } from '@/server/db/updateLogImage.repo'
import { DeleteUpdateLogInput } from '../types'
import { deleteOwnedImageFiles } from '../helpers/deleteOwnedImageFiles'

export async function deleteUpdateLog(supabase: DBClient, p: DeleteUpdateLogInput): Promise<Result<void>> {
    try {
        const lookup = await findUpdateLogById(supabase, p.updateLogId)
        if (!lookup.ok) return lookup
        if (!lookup.value) return Err({ message: 'Update log not found', code: 'NOT_FOUND' })

        const imagesRes = await findUpdateLogImagesByLogId(supabase, p.updateLogId)
        if (!imagesRes.ok) {
            logger.warn({ updateLogId: p.updateLogId, error: imagesRes.error }, 'Failed to look up update log images; their files will be orphaned')
        }

        const delRow = await deleteUpdateLogById(supabase, p.updateLogId)
        if (!delRow.ok) return delRow

        if (imagesRes.ok) {
            await deleteOwnedImageFiles(p.updateLogId, imagesRes.value.map(img => img.storage_path))
        }

        return Ok(undefined)
    } catch (error) {
        return Err(serializeError(error))
    }
}
