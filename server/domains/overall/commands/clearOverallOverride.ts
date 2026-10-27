import { Err, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { deletePlayerOverall } from '@/server/db/overall.repo'
import { OverallConfig } from '../types'
import { getOverallConfig } from '../queries/getOverallConfig'

export async function clearOverallOverride(
    supabase: DBClient,
    p: { seasonId: string; playerId: string },
): Promise<Result<OverallConfig>> {
    try {
        const deleted = await deletePlayerOverall(supabase, p)
        if (!deleted.ok) return deleted
        return getOverallConfig(supabase, p.seasonId)
    } catch (error) {
        return Err(serializeError(error))
    }
}
