import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findUpdateLogById } from '@/server/db/updateLog.repo'
import {
    deleteUpdateLogImagesByIds,
    findUpdateLogImagesByLogId,
    updateUpdateLogImageRow,
} from '@/server/db/updateLogImage.repo'
import { UpdateLogAdminImage, UpdateUpdateLogImagesInput } from '../types'
import { deleteOwnedImageFiles } from '../helpers/deleteOwnedImageFiles'
import { toUpdateLogAdminImage } from '../helpers/toAdminShapes'

function placeholderName(id: string): string {
    return `renaming-${id.replace(/-/g, '').slice(0, 12)}`
}

export async function updateUpdateLogImages(supabase: DBClient, p: UpdateUpdateLogImagesInput): Promise<Result<UpdateLogAdminImage[]>> {
    try {
        const lookup = await findUpdateLogById(supabase, p.updateLogId)
        if (!lookup.ok) return lookup
        if (!lookup.value) return Err({ message: 'Update log not found', code: 'NOT_FOUND' })

        const currentRes = await findUpdateLogImagesByLogId(supabase, p.updateLogId)
        if (!currentRes.ok) return currentRes
        const current = new Map(currentRes.value.map(img => [img.id, img]))

        const removed = new Set(p.removedIds.filter(id => current.has(id)))
        const changes = p.changes.filter(c => current.has(c.id) && !removed.has(c.id))

        const finalNames = new Map<string, string>()
        for (const img of current.values()) if (!removed.has(img.id)) finalNames.set(img.id, img.handle)
        for (const c of changes) finalNames.set(c.id, c.name)
        if (new Set(finalNames.values()).size !== finalNames.size) {
            return Err({ message: 'Another image in this log already uses that name.', code: 'UPDATE_LOG_IMAGE_NAME_TAKEN' })
        }

        const deleted = await deleteUpdateLogImagesByIds(supabase, p.updateLogId, [...removed])
        if (!deleted.ok) return deleted
        await deleteOwnedImageFiles(p.updateLogId, deleted.value)

        const renamed = changes.filter(c => c.name !== current.get(c.id)!.handle)
        for (const c of renamed) {
            const res = await updateUpdateLogImageRow(supabase, p.updateLogId, c.id, { handle: placeholderName(c.id) })
            if (!res.ok) return res
        }
        for (const c of changes) {
            const row = current.get(c.id)!
            if (c.name === row.handle && c.caption === (row.caption ?? null)) continue
            const res = await updateUpdateLogImageRow(supabase, p.updateLogId, c.id, { handle: c.name, caption: c.caption })
            if (!res.ok) return res
        }

        const fresh = await findUpdateLogImagesByLogId(supabase, p.updateLogId)
        if (!fresh.ok) return fresh
        return Ok(fresh.value.map(toUpdateLogAdminImage))
    } catch (error) {
        return Err(serializeError(error))
    }
}
