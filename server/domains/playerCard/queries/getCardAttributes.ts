import { DBClient } from '@/shared/types/db'
import { Err, Result } from '@/shared/types/result'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { findCardAttributesBySeason } from '@/server/db/playerCards.repo'
import { CardAttributes } from '../types'

export async function getCardAttributes(supabase: DBClient, p: { seasonNumber: number }): Promise<Result<CardAttributes[]>> {
    try {
        const rows = await findCardAttributesBySeason(supabase, p.seasonNumber)
        if (!rows.ok) {
            logger.error({ seasonNumber: p.seasonNumber, error: rows.error }, 'Failed to fetch card attributes')
        }
        return rows
    } catch (error) {
        logger.error({ error, seasonNumber: p.seasonNumber }, 'Unexpected error fetching card attributes')
        return Err(serializeError(error))
    }
}
