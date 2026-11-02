import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { BUCKETS, STORAGE_PATHS } from '@/server/storage/storage.paths'
import { uploadFile } from '@/server/storage/storage.service'
import { findCardTemplateById } from '@/server/db/playerCards.repo'
import { CARD_ART_FILE_NAME, CARD_ART_MAX_BYTES } from '../types'
import { inspectCardArt } from '../helpers/inspectCardArt'
import { forgetTemplateArtListing, listTemplateArtFiles } from '../helpers/templateArtStorage'

export async function uploadCardTemplateArt(
    admin: DBClient,
    p: { templateId: string; fileName: string; file: File; userId: string },
): Promise<Result<{ width: number; height: number }>> {
    try {
        if (!CARD_ART_FILE_NAME.test(p.fileName)) {
            return Err({ message: 'Art file names use letters, numbers, dashes or underscores and end in .png', code: 'VALIDATION_ERROR' })
        }
        if (p.file.size > CARD_ART_MAX_BYTES) {
            return Err({ message: 'Art must be 2.9 MB or smaller. It is stored as uploaded, so export a smaller PNG.', code: 'VALIDATION_ERROR' })
        }

        const tier = await findCardTemplateById(admin, p.templateId)
        if (!tier.ok) return tier
        if (!tier.value) return Err({ message: 'Card tier not found', code: 'NOT_FOUND' })

        const inspected = await inspectCardArt(Buffer.from(await p.file.arrayBuffer()))
        if (!inspected.ok) return inspected

        const uploaded = await uploadFile(admin, {
            bucket: BUCKETS.PUBLIC,
            path: STORAGE_PATHS.cardTemplateAsset(p.templateId, p.fileName),
            file: p.file,
            contentType: 'image/png',
            upsert: true,
            compress: false,
            userId: p.userId,
        })
        if (!uploaded.ok) return uploaded

        forgetTemplateArtListing(p.templateId)
        const listed = await listTemplateArtFiles(p.templateId)
        if (!listed.ok) logger.warn({ error: listed.error, templateId: p.templateId }, 'uploadCardTemplateArt: relist failed')

        return Ok(inspected.value)
    } catch (error) {
        logger.error({ error }, 'uploadCardTemplateArt: unexpected error')
        return Err(serializeError(error))
    }
}
