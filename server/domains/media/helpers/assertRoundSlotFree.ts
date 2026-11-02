import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { findRoundMediaPost } from '@/server/db/mediaPost.repo'
import { SerializableError } from '@/server/utils/serializeableError'
import { PLAYOFF_ROUNDS } from '@/server/domains/playoff/types/schemas'

export type RoundSlotType = 'potw' | 'totw'

const ROUND_SLOT_INDEX = 'media_posts_one_round_slot'
const PLAYOFF_ROUND_KEYS = new Set<string>(PLAYOFF_ROUNDS)

export function isMediaRoundKey(roundKey: string): boolean {
    return /^week:\d+$/.test(roundKey) || PLAYOFF_ROUND_KEYS.has(roundKey)
}

export function isRoundSlotViolation(error: SerializableError): boolean {
    return error.message.includes(ROUND_SLOT_INDEX)
}

export function roundSlotTakenError(type: RoundSlotType): SerializableError {
    return {
        message: `This round already has a ${type === 'potw' ? 'POTW' : 'TOTW'}. Edit it instead.`,
        code: 'MEDIA_ROUND_SLOT_TAKEN',
    }
}

export async function assertRoundSlotFree(
    supabase: DBClient,
    seasonId: string,
    type: RoundSlotType,
    roundKey: string,
): Promise<Result<void>> {
    const existing = await findRoundMediaPost(supabase, seasonId, type, roundKey)
    if (!existing.ok) return existing
    if (existing.value) return Err(roundSlotTakenError(type))
    return Ok(undefined)
}
