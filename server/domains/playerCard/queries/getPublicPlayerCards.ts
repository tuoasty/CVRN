import { DBClient } from '@/shared/types/db'
import { Err, Ok, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { findPublicPlayerCards } from '@/server/db/playerCards.repo'
import { PublicPlayerCard } from '../types'
import { toPublicPlayerCards } from '../helpers/toCardShapes'

export async function getPublicPlayerCards(supabase: DBClient, p: { playerId: string }): Promise<Result<PublicPlayerCard[]>> {
    try {
        const rows = await findPublicPlayerCards(supabase, p)
        if (!rows.ok) {
            logger.error({ playerId: p.playerId, error: rows.error }, 'Failed to fetch public player cards')
            return rows
        }
        return Ok(toPublicPlayerCards(rows.value))
    } catch (error) {
        logger.error({ error, playerId: p.playerId }, 'Unexpected error fetching public player cards')
        return Err(serializeError(error))
    }
}
