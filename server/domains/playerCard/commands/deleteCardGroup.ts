import { Err, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { countTemplatesByGroup, deleteCardGroup as deleteGroup } from '@/server/db/playerCards.repo'

export async function deleteCardGroup(supabase: DBClient, groupId: string): Promise<Result<null>> {
    try {
        const tiers = await countTemplatesByGroup(supabase, groupId)
        if (!tiers.ok) return tiers
        if (tiers.value > 0) {
            return Err({ message: `Delete its ${tiers.value} tier${tiers.value === 1 ? '' : 's'} first`, code: 'CONFLICT' })
        }
        return await deleteGroup(supabase, groupId)
    } catch (error) {
        return Err(serializeError(error))
    }
}
