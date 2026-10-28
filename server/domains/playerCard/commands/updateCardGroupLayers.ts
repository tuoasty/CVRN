import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { updateCardGroupLayers as updateLayers } from '@/server/db/playerCards.repo'
import { CardLayer } from '../types'

export async function updateCardGroupLayers(
    supabase: DBClient,
    p: { groupId: string; layers: CardLayer[] },
): Promise<Result<CardLayer[]>> {
    try {
        const saved = await updateLayers(supabase, { groupId: p.groupId, layers: p.layers })
        if (!saved.ok) return saved
        return Ok(p.layers)
    } catch (error) {
        return Err(serializeError(error))
    }
}
