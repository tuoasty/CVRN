import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findOverallScalingsBySeason, findPlayerOverallsBySeason } from '@/server/db/overall.repo'
import { OverallConfig } from '../types'
import { toOverallConfig } from '../helpers/toOverallShapes'

export async function getOverallConfig(supabase: DBClient, seasonId: string): Promise<Result<OverallConfig>> {
    try {
        const [scalings, overrides] = await Promise.all([
            findOverallScalingsBySeason(supabase, seasonId),
            findPlayerOverallsBySeason(supabase, seasonId),
        ])
        if (!scalings.ok) return scalings
        if (!overrides.ok) return overrides
        return Ok(toOverallConfig(scalings.value, overrides.value))
    } catch (error) {
        return Err(serializeError(error))
    }
}
