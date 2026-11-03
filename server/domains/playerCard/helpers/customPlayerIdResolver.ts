import { Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { savePlayer } from '@/server/domains/player'
import { CardSubject, CustomCardPlayer } from '../types'

export function customPlayerIdResolver(
    supabase: DBClient,
    player: CustomCardPlayer,
    subject: CardSubject,
): { ensure: () => Promise<Result<string>>; wasRegistered: () => boolean } {
    let registered = false
    return {
        ensure: async () => {
            if (subject.playerId) return Ok(subject.playerId)
            const saved = await savePlayer(supabase, { ...player, avatarUrl: subject.avatarUrl })
            if (!saved.ok) return saved
            registered = true
            return Ok(saved.value.id)
        },
        wasRegistered: () => registered,
    }
}
