import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { savePlayer } from '@/server/domains/player'
import { GenerateCustomPlayerCardInput, PlayerCard } from '../types'
import { buildCustomCardData } from '../helpers/buildCardData'
import { resolveCustomSubject } from '../helpers/customSubject'
import { renderAndSaveCard } from '../helpers/renderAndSaveCard'

export async function generateCustomPlayerCard(
    supabase: DBClient,
    p: GenerateCustomPlayerCardInput,
): Promise<Result<{ card: PlayerCard; registered: boolean }>> {
    try {
        const subject = await resolveCustomSubject(supabase, p)
        if (!subject.ok) return subject

        let registered = false
        const card = await renderAndSaveCard(supabase, {
            seasonNumber: p.seasonNumber,
            groupId: p.groupId,
            subject: subject.value,
            data: buildCustomCardData(subject.value, p.values, p.seasonNumber),
            ensurePlayerId: async () => {
                if (subject.value.playerId) return Ok(subject.value.playerId)
                const saved = await savePlayer(supabase, { ...p.player, avatarUrl: subject.value.avatarUrl })
                if (!saved.ok) return saved
                registered = true
                return Ok(saved.value.id)
            },
        })
        if (!card.ok) return card
        return Ok({ card: card.value, registered })
    } catch (error) {
        logger.error({ error }, 'generateCustomPlayerCard: unexpected error')
        return Err(serializeError(error))
    }
}
