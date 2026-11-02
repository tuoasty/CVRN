import { Err, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { PreviewCustomPlayerCardInput } from '../types'
import { buildCustomCardData } from '../helpers/buildCardData'
import { resolveCustomSubject } from '../helpers/customSubject'
import { renderCardPreview } from '../helpers/renderCardPreview'

export async function previewCustomPlayerCard(supabase: DBClient, p: PreviewCustomPlayerCardInput): Promise<Result<string>> {
    try {
        const subject = await resolveCustomSubject(supabase, p)
        if (!subject.ok) return subject

        return await renderCardPreview(supabase, {
            templateId: p.templateId,
            layers: p.layers,
            avatarUrl: subject.value.avatarUrl,
            teamLogoUrl: subject.value.teamLogoUrl,
            data: buildCustomCardData(subject.value, p.values, p.seasonNumber),
        })
    } catch (error) {
        logger.error({ error }, 'previewCustomPlayerCard: unexpected error')
        return Err(serializeError(error))
    }
}
