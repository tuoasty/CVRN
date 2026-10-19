import { DBClient } from '@/shared/types/db'
import { Ok, Result } from '@/shared/types/result'
import { findAllGameTerms } from '@/server/db/gameTerm.repo'
import { toGameTerm } from '../helpers/toGameTerm'
import type { GameTerm } from '../terms/types'

export async function getGameTerms(supabase: DBClient): Promise<Result<GameTerm[]>> {
    const rows = await findAllGameTerms(supabase)
    if (!rows.ok) return rows
    return Ok(rows.value.map(toGameTerm).filter((t): t is GameTerm => t !== null))
}
