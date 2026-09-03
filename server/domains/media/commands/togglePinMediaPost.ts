import { Err, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { countPinnedByBucket, updateMediaPostPin } from '@/server/db/mediaPost.repo'
import { MediaPost } from '../types'

type PinBucket = 'gfx' | 'video' | 'clip'

const BUCKET_LIMITS: Record<PinBucket, number> = {
    gfx:   3,
    video: 2,
    clip:  0,
}

const BUCKET_MESSAGES: Record<PinBucket, string> = {
    gfx:   'Only 3 GFX posts can be pinned at a time.',
    video: 'Only 2 video posts can be pinned at a time.',
    clip:  'Clips are discontinued and can no longer be pinned.',
}

function toBucket(postType: string): PinBucket | null {
    if (postType === 'gfx' || postType === 'video' || postType === 'clip') return postType
    return null
}

export async function togglePinMediaPost(
    supabase: DBClient,
    id: string,
    pin: boolean,
    postType: string,
): Promise<Result<MediaPost>> {
    if (pin) {
        const bucket = toBucket(postType)
        if (bucket) {
            const countResult = await countPinnedByBucket(supabase, bucket)
            if (!countResult.ok) return countResult
            if (countResult.value >= BUCKET_LIMITS[bucket]) {
                return Err({ message: BUCKET_MESSAGES[bucket], code: 'MEDIA_PIN_LIMIT_EXCEEDED' })
            }
        }
    }
    return updateMediaPostPin(supabase, id, pin)
}
