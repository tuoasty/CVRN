import { Err, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { upsertOverallScalingRows } from '@/server/db/overall.repo'
import { OverallConfig, OverallScaling } from '../types'
import { toOverallScalingInsert } from '../helpers/toOverallShapes'
import { getOverallConfig } from '../queries/getOverallConfig'

export async function saveOverallScalings(
    supabase: DBClient,
    p: { seasonNumber: number; scalings: OverallScaling[] },
): Promise<Result<OverallConfig>> {
    try {
        const saved = await upsertOverallScalingRows(supabase, p.scalings.map(s => toOverallScalingInsert(p.seasonNumber, s)))
        if (!saved.ok) return saved
        return getOverallConfig(supabase, p.seasonNumber)
    } catch (error) {
        return Err(serializeError(error))
    }
}
