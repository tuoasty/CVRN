import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { countPinnedMediaPosts, updateMediaPostPin } from '@/server/db/mediaPost.repo'
import { MediaPost } from '../types'

const MAX_PINNED = 3

export async function togglePinMediaPost(supabase: DBClient, id: string, pin: boolean): Promise<Result<MediaPost>> {
    if (pin) {
        const countResult = await countPinnedMediaPosts(supabase)
        if (!countResult.ok) return countResult
        if (countResult.value >= MAX_PINNED) {
            return Err({ message: `Only ${MAX_PINNED} posts can be pinned at a time.`, code: 'MEDIA_PIN_LIMIT_EXCEEDED' })
        }
    }
    return updateMediaPostPin(supabase, id, pin)
}
