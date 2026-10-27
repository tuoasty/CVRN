import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findSeasonOverallInputs } from '@/server/db/overall.repo'
import { OverallInputRow } from '../types'
import { toOverallInputRow } from '../helpers/toOverallShapes'

export async function getSeasonOverallInputs(supabase: DBClient, seasonId: string): Promise<Result<OverallInputRow[]>> {
    try {
        const result = await findSeasonOverallInputs(supabase, seasonId)
        if (!result.ok) return result
        return Ok(result.value.map(toOverallInputRow))
    } catch (error) {
        return Err(serializeError(error))
    }
}
