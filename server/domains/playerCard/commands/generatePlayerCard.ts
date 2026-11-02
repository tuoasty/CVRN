import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { getOverallConfig } from '@/server/domains/overall'
import type { OverallInputRow } from '@/server/domains/overall'
import { CardOverrides, PlayerCard } from '../types'
import { buildCardData } from '../helpers/buildCardData'
import { renderAndSaveCard } from '../helpers/renderAndSaveCard'

export async function generatePlayerCard(
    supabase: DBClient,
    p: { seasonNumber: number; groupId: string; player: OverallInputRow; overrides?: CardOverrides },
): Promise<Result<PlayerCard>> {
    try {
        const { seasonNumber, groupId, player } = p

        const config = await getOverallConfig(supabase, seasonNumber)
        if (!config.ok) return config

        return await renderAndSaveCard(supabase, {
            seasonNumber,
            groupId,
            subject: player,
            data: buildCardData(player, config.value, seasonNumber, p.overrides),
            ensurePlayerId: async () => Ok(player.playerId),
        })
    } catch (error) {
        logger.error({ error }, 'generatePlayerCard: unexpected error')
        return Err(serializeError(error))
    }
}
