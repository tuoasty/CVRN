import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { GenerateCustomPlayerCardInput, PlayerCard } from '../types'
import { buildCustomCardData } from '../helpers/buildCardData'
import { resolveCustomSubject } from '../helpers/customSubject'
import { customPlayerIdResolver } from '../helpers/customPlayerIdResolver'
import { renderAndSaveCard } from '../helpers/renderAndSaveCard'

export async function generateCustomPlayerCard(
    supabase: DBClient,
    p: GenerateCustomPlayerCardInput,
): Promise<Result<{ card: PlayerCard; registered: boolean }>> {
    try {
        const subject = await resolveCustomSubject(supabase, p)
        if (!subject.ok) return subject

        const playerId = customPlayerIdResolver(supabase, p.player, subject.value)
        const card = await renderAndSaveCard(supabase, {
            seasonNumber: p.seasonNumber,
            groupId: p.groupId,
            subject: subject.value,
            data: buildCustomCardData(subject.value, p.values, p.seasonNumber),
            ensurePlayerId: playerId.ensure,
        })
        if (!card.ok) return card
        return Ok({ card: card.value, registered: playerId.wasRegistered() })
    } catch (error) {
        logger.error({ error }, 'generateCustomPlayerCard: unexpected error')
        return Err(serializeError(error))
    }
}
