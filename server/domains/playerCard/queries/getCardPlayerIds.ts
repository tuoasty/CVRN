import { Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { findPlayerIdsWithCards } from '@/server/db/playerCards.repo'

export function getCardPlayerIds(supabase: DBClient, p: { seasonNumber: number; groupId: string }): Promise<Result<string[]>> {
    return findPlayerIdsWithCards(supabase, p)
}
