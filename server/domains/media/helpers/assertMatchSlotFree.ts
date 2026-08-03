import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { findAllMediaPosts } from '@/server/db/mediaPost.repo'
import { MatchMediaSlot } from '../types'

const SLOT_LABELS: Record<MatchMediaSlot, string> = {
    gfx:   'GFX',
    video: 'VOD',
}

export async function assertMatchSlotFree(
    supabase: DBClient,
    matchId: string,
    slot: MatchMediaSlot,
    excludePostId?: string,
): Promise<Result<void>> {
    const existing = await findAllMediaPosts(supabase, { matchId, type: slot })
    if (!existing.ok) return existing

    const taken = existing.value.some(p => p.id !== excludePostId)
    if (taken) {
        return Err({
            message: `This match already has a ${SLOT_LABELS[slot]} attached. Remove it first.`,
            code: 'MEDIA_MATCH_SLOT_TAKEN',
        })
    }

    return Ok(undefined)
}
