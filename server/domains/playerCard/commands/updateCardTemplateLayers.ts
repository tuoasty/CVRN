import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { updateCardTemplateLayers as updateLayers } from '@/server/db/playerCards.repo'
import { CardLayer } from '../types'

export async function updateCardTemplateLayers(
    supabase: DBClient,
    p: { templateId: string; layers: CardLayer[] },
): Promise<Result<CardLayer[]>> {
    try {
        const saved = await updateLayers(supabase, { templateId: p.templateId, layers: p.layers })
        if (!saved.ok) return saved
        return Ok(p.layers)
    } catch (error) {
        return Err(serializeError(error))
    }
}
