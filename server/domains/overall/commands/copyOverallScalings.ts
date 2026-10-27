import { Err, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findSeasonById } from '@/server/db/seasons.repo'
import { findOverallScalingsBySeason, upsertOverallScalingRows } from '@/server/db/overall.repo'
import { OverallConfig } from '../types'
import { withSeasonId } from '../helpers/toOverallShapes'
import { getOverallConfig } from '../queries/getOverallConfig'

export async function copyOverallScalings(
    supabase: DBClient,
    p: { seasonId: string; fromSeasonId: string },
): Promise<Result<OverallConfig>> {
    try {
        const [target, source] = await Promise.all([
            findSeasonById(supabase, p.seasonId),
            findSeasonById(supabase, p.fromSeasonId),
        ])
        if (!target.ok) return target
        if (!source.ok) return source
        if (!target.value || !source.value) return Err({ message: 'Season not found', code: 'NOT_FOUND' })
        if (target.value.region_id !== source.value.region_id) {
            return Err({ message: 'Scalings can only be copied from a season in the same region', code: 'VALIDATION_ERROR' })
        }

        const rows = await findOverallScalingsBySeason(supabase, p.fromSeasonId)
        if (!rows.ok) return rows
        if (rows.value.length === 0) {
            return Err({ message: `${source.value.name} has no saved scalings to copy`, code: 'NOT_FOUND' })
        }

        const saved = await upsertOverallScalingRows(supabase, rows.value.map(r => withSeasonId(r, p.seasonId)))
        if (!saved.ok) return saved
        return getOverallConfig(supabase, p.seasonId)
    } catch (error) {
        return Err(serializeError(error))
    }
}
