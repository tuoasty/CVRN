import { randomUUID } from 'node:crypto'
import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { BUCKETS, STORAGE_PATHS } from '@/server/storage/storage.paths'
import { uploadFile, deleteFile } from '@/server/storage/storage.service'
import { insertMediaPost } from '@/server/db/mediaPost.repo'
import { CreateMediaInput, MediaPost } from '../types'

export async function createMediaPost(supabase: DBClient, p: CreateMediaInput): Promise<Result<MediaPost>> {
    const postId = randomUUID()
    let uploadedPath: string | null = null
    let success = false

    try {
        let imageUrl: string | null = null

        if (p.imageFile && p.imageFile.size > 0) {
            const ext = p.imageFile.name.split('.').pop() ?? 'jpg'
            const path = STORAGE_PATHS.mediaPost(postId, ext)

            const uploadRes = await uploadFile(supabase, {
                bucket: BUCKETS.MEDIA,
                path,
                file: p.imageFile,
                contentType: p.imageFile.type,
                upsert: false,
                compress: false,
                userId: p.userId,
            })

            if (!uploadRes.ok) {
                logger.error({ postId, error: uploadRes.error }, 'Failed to upload media image')
                return Err({ message: 'Failed to upload image', code: 'INTEGRATION_ERROR' })
            }

            uploadedPath = path
            imageUrl = uploadRes.value.url
        }

        const insertResult = await insertMediaPost(supabase, {
            id:          postId,
            type:        p.type,
            title:       p.title,
            description: p.description ?? null,
            image_url:   imageUrl,
            video_url:   p.videoUrl ?? null,
            match_id:    p.matchId ?? null,
            team_id:     p.teamId ?? null,
            season_id:   p.seasonId ?? null,
            created_by:  p.userId,
        })

        if (!insertResult.ok) {
            logger.error({ postId, error: insertResult.error }, 'Failed to insert media post')
            return insertResult
        }

        success = true
        return Ok(insertResult.value)
    } catch (error) {
        return Err(serializeError(error))
    } finally {
        if (!success && uploadedPath) {
            await deleteFile(supabase, { bucket: BUCKETS.MEDIA, path: uploadedPath })
        }
    }
}
