import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { findMediaPostsPaged } from '@/server/db/mediaPost.repo'
import { GetPagedMediaInput, MediaFilterType, PagedMediaResult } from '../types'

const FILTER_TYPE_MAP: Record<MediaFilterType, string[]> = {
    all:    ['gfx', 'video', 'news', 'recap'],
    videos: ['video'],
    gfx:    ['gfx'],
    clips:  ['clip'],
}

export async function getPagedMediaPosts(
    supabase: DBClient,
    input: GetPagedMediaInput,
): Promise<Result<PagedMediaResult>> {
    try {
        const types = FILTER_TYPE_MAP[input.filter]
        const result = await findMediaPostsPaged(supabase, types, input.page, input.pageSize, input.search)
        if (!result.ok) {
            logger.error({ input, error: result.error }, 'Failed to fetch paged media posts')
            return result
        }
        const totalPages = Math.ceil(result.value.total / input.pageSize)
        return Ok({
            posts:      result.value.posts,
            total:      result.value.total,
            page:       input.page,
            pageSize:   input.pageSize,
            totalPages,
        })
    } catch (error) {
        return Err(serializeError(error))
    }
}
