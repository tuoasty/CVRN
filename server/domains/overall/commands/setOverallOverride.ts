import { Err, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { upsertPlayerOverall } from '@/server/db/overall.repo'
import { OverallConfig } from '../types'
import { getOverallConfig } from '../queries/getOverallConfig'

export async function setOverallOverride(
    supabase: DBClient,
    p: { seasonId: string; playerId: string; overall: number },
): Promise<Result<OverallConfig>> {
    try {
        const saved = await upsertPlayerOverall(supabase, p)
        if (!saved.ok) return saved
        return getOverallConfig(supabase, p.seasonId)
    } catch (error) {
        return Err(serializeError(error))
    }
}
