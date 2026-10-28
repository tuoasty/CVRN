import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { updateCardTemplate as updateTemplate } from '@/server/db/playerCards.repo'
import { UpdateCardTemplateInput } from '../types'

export async function updateCardTemplate(supabase: DBClient, p: UpdateCardTemplateInput): Promise<Result<null>> {
    try {
        const saved = await updateTemplate(supabase, {
            templateId: p.templateId,
            patch: { name: p.name, min_ovr: p.minOvr },
        })
        if (!saved.ok) return saved
        return Ok(null)
    } catch (error) {
        return Err(serializeError(error))
    }
}
