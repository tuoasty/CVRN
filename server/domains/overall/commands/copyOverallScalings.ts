import { Err, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findOverallScalingsBySeasonNumber, upsertOverallScalingRows } from '@/server/db/overall.repo'
import { OverallConfig } from '../types'
import { withSeasonNumber } from '../helpers/toOverallShapes'
import { getOverallConfig } from '../queries/getOverallConfig'

export async function copyOverallScalings(
    supabase: DBClient,
    p: { seasonNumber: number; fromSeasonNumber: number },
): Promise<Result<OverallConfig>> {
    try {
        const rows = await findOverallScalingsBySeasonNumber(supabase, p.fromSeasonNumber)
        if (!rows.ok) return rows
        if (rows.value.length === 0) {
            return Err({ message: `Season ${p.fromSeasonNumber} has no saved scalings to copy`, code: 'NOT_FOUND' })
        }

        const saved = await upsertOverallScalingRows(supabase, rows.value.map(r => withSeasonNumber(r, p.seasonNumber)))
        if (!saved.ok) return saved
        return getOverallConfig(supabase, p.seasonNumber)
    } catch (error) {
        return Err(serializeError(error))
    }
}
