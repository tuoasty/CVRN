import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findOverallScalingsBySeasonNumber, findPlayerOverallsBySeasonNumber } from '@/server/db/overall.repo'
import { OverallConfig } from '../types'
import { toOverallConfig } from '../helpers/toOverallShapes'

export async function getOverallConfig(supabase: DBClient, seasonNumber: number): Promise<Result<OverallConfig>> {
    try {
        const [scalings, overrides] = await Promise.all([
            findOverallScalingsBySeasonNumber(supabase, seasonNumber),
            findPlayerOverallsBySeasonNumber(supabase, seasonNumber),
        ])
        if (!scalings.ok) return scalings
        if (!overrides.ok) return overrides
        return Ok(toOverallConfig(scalings.value, overrides.value))
    } catch (error) {
        return Err(serializeError(error))
    }
}
