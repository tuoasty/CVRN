import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findUpdateLogById } from '@/server/db/updateLog.repo'
import { findUpdateLogImagesByLogId } from '@/server/db/updateLogImage.repo'
import { UpdateLogEditorData } from '../types'
import { toUpdateLogAdminDetail, toUpdateLogAdminImage } from '../helpers/toAdminShapes'

export async function getUpdateLogForAdmin(supabase: DBClient, id: string): Promise<Result<UpdateLogEditorData>> {
    try {
        const result = await findUpdateLogById(supabase, id)
        if (!result.ok) return result
        if (!result.value) return Err({ message: 'Update log not found', code: 'NOT_FOUND' })

        const images = await findUpdateLogImagesByLogId(supabase, id)
        if (!images.ok) return images

        return Ok({ log: toUpdateLogAdminDetail(result.value), images: images.value.map(toUpdateLogAdminImage) })
    } catch (error) {
        return Err(serializeError(error))
    }
}
