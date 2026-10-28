import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { updateCardGroup as updateGroup } from '@/server/db/playerCards.repo'
import { UpdateCardGroupInput } from '../types'

export async function updateCardGroup(supabase: DBClient, p: UpdateCardGroupInput): Promise<Result<null>> {
    try {
        const saved = await updateGroup(supabase, {
            groupId: p.groupId,
            patch: {
                name: p.name,
                is_limited: p.isLimited,
                is_active: p.isActive,
                sort_order: p.sortOrder,
                canvas_width: p.width,
                canvas_height: p.height,
            },
        })
        if (!saved.ok) return saved
        return Ok(null)
    } catch (error) {
        return Err(serializeError(error))
    }
}
