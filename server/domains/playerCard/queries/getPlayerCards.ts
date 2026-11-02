import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { findPlayerCards } from '@/server/db/playerCards.repo'
import { PlayerCard } from '../types'
import { toPlayerCard } from '../helpers/toCardShapes'

export async function getPlayerCards(
    supabase: DBClient,
    p: { playerId: string; seasonNumber: number },
): Promise<Result<PlayerCard[]>> {
    try {
        const rows = await findPlayerCards(supabase, p)
        if (!rows.ok) return rows
        return Ok(rows.value.map(toPlayerCard))
    } catch (error) {
        return Err(serializeError(error))
    }
}
