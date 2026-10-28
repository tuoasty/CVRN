import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { insertCardGroup } from '@/server/db/playerCards.repo'
import { CreateCardGroupInput } from '../types'

export async function createCardGroup(supabase: DBClient, p: CreateCardGroupInput): Promise<Result<{ id: string }>> {
    try {
        const saved = await insertCardGroup(supabase, {
            name: p.name,
            is_limited: p.isLimited,
            is_active: p.isActive,
            sort_order: p.sortOrder,
            canvas_width: p.width,
            canvas_height: p.height,
        })
        if (!saved.ok) return saved
        return Ok({ id: saved.value.id })
    } catch (error) {
        return Err(serializeError(error))
    }
}
