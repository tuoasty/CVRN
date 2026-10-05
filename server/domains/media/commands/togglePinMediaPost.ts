import { Err, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { countPinnedByTypes, updateMediaPostPin } from '@/server/db/mediaPost.repo'
import { MediaPost } from '../types'

type PinBucket = 'visual' | 'video' | 'clip'

const BUCKETS: Record<PinBucket, { types: MediaPost['type'][]; limit: number; message: string }> = {
    visual: { types: ['gfx', 'feature'], limit: 3, message: 'Only 3 GFX or feature posts can be pinned at a time.' },
    video:  { types: ['video'],          limit: 2, message: 'Only 2 video posts can be pinned at a time.' },
    clip:   { types: ['clip'],           limit: 0, message: 'Clips are discontinued and can no longer be pinned.' },
}

function toBucket(postType: string): PinBucket | null {
    if (postType === 'gfx' || postType === 'feature') return 'visual'
    if (postType === 'video' || postType === 'clip') return postType
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
            const countResult = await countPinnedByTypes(supabase, BUCKETS[bucket].types)
            if (!countResult.ok) return countResult
            if (countResult.value >= BUCKETS[bucket].limit) {
                return Err({ message: BUCKETS[bucket].message, code: 'MEDIA_PIN_LIMIT_EXCEEDED' })
            }
        }
    }
    return updateMediaPostPin(supabase, id, pin)
}
