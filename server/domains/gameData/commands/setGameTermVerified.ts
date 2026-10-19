import { DBClient } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { updateGameTermVerified } from '@/server/db/gameTerm.repo'
import { toGameTerm } from '../helpers/toGameTerm'
import type { GameTerm } from '../terms/types'
import type { SetGameTermVerifiedInput } from '../types/schemas'

export async function setGameTermVerified(supabase: DBClient, p: { input: SetGameTermVerifiedInput; userId: string }): Promise<Result<GameTerm>> {
    const saved = await updateGameTermVerified(supabase, p.input.kind, p.input.tag, p.input.verified, p.userId)
    if (!saved.ok) return saved
    const term = toGameTerm(saved.value)
    return term ? Ok(term) : Err({ message: 'Saved term has an unknown kind', code: 'DB_ERROR' })
}
