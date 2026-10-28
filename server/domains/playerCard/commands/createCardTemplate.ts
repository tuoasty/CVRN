import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { insertCardTemplate } from '@/server/db/playerCards.repo'
import { CreateCardTemplateInput } from '../types'

export async function createCardTemplate(supabase: DBClient, p: CreateCardTemplateInput): Promise<Result<{ id: string }>> {
    try {
        const saved = await insertCardTemplate(supabase, { group_id: p.groupId, name: p.name, min_ovr: p.minOvr })
        if (!saved.ok) return saved
        return Ok({ id: saved.value.id })
    } catch (error) {
        return Err(serializeError(error))
    }
}
