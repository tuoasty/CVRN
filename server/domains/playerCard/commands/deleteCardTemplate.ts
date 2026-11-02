import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { countPlayerCardsByTemplate, deleteCardTemplate as deleteTemplate } from '@/server/db/playerCards.repo'
import { removeTemplateArtFolder } from '../helpers/templateArtStorage'

export async function deleteCardTemplate(supabase: DBClient, templateId: string): Promise<Result<null>> {
    try {
        const cards = await countPlayerCardsByTemplate(supabase, templateId)
        if (!cards.ok) return cards
        if (cards.value > 0) {
            return Err({ message: `${cards.value} generated card${cards.value === 1 ? ' uses' : 's use'} this tier`, code: 'CONFLICT' })
        }

        const deleted = await deleteTemplate(supabase, templateId)
        if (!deleted.ok) return deleted

        const cleaned = await removeTemplateArtFolder(templateId)
        if (!cleaned.ok) logger.warn({ error: cleaned.error, templateId }, 'deleteCardTemplate: art cleanup failed')

        return Ok(null)
    } catch (error) {
        return Err(serializeError(error))
    }
}
