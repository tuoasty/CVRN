import { randomUUID } from 'node:crypto'
import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { BUCKETS, STORAGE_PATHS } from '@/server/storage/storage.paths'
import { uploadFile, deleteFile } from '@/server/storage/storage.service'
import { insertMediaPost } from '@/server/db/mediaPost.repo'
import { CreateMediaInput, MediaPost } from '../types'

const TIKTOK_HOSTNAMES = new Set(['www.tiktok.com', 'tiktok.com', 'vt.tiktok.com', 'm.tiktok.com'])

function isTikTokUrl(raw: string): boolean {
    try {
        const u = new URL(raw)
        return u.protocol === 'https:' && TIKTOK_HOSTNAMES.has(u.hostname)
    } catch {
        return false
    }
}

async function resolveTikTokVideoId(url: string): Promise<string | null> {
    if (!isTikTokUrl(url)) return null

    const direct = url.match(/\/video\/(\d+)/)
    if (direct) return direct[1]

    try {
        const res = await fetch(url, { redirect: 'manual' })
        const location = res.headers.get('location')
        if (!location || !isTikTokUrl(location)) return null
        return location.match(/\/video\/(\d+)/)?.[1] ?? null
    } catch {
        return null
    }
}

export async function createMediaPost(supabase: DBClient, p: CreateMediaInput): Promise<Result<MediaPost>> {
    const postId = randomUUID()
    let uploadedPath: string | null = null
    let success = false

    try {
        let imageUrl: string | null = null
        let title = p.title
        let description = p.description ?? null
        let videoUrl = p.videoUrl ?? null

        if (p.type === 'clip' && p.videoUrl) {
            const videoId = await resolveTikTokVideoId(p.videoUrl)
            if (!videoId) {
                return Err({ message: 'Could not extract TikTok video ID from URL. Paste a full or short TikTok link.', code: 'VALIDATION_ERROR' })
            }
            videoUrl = videoId

            try {
                const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(p.videoUrl)}`
                const res = await fetch(oembedUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                        'Accept': 'application/json, text/javascript, */*',
                    },
                })
                if (res.ok) {
                    const ct = res.headers.get('content-type') ?? ''
                    if (ct.includes('application/json') || ct.includes('text/javascript')) {
                        const data = await res.json()
                        if (data.thumbnail_url) imageUrl    = data.thumbnail_url
                        if (data.title)         title       = data.title
                        if (data.author_name)   description = data.author_name
                    } else {
                        logger.warn({ postId }, 'TikTok oEmbed returned non-JSON — metadata skipped')
                    }
                } else {
                    logger.warn({ postId, status: res.status }, 'TikTok oEmbed non-OK — metadata skipped')
                }
            } catch (err) {
                logger.warn({ postId, err }, 'TikTok oEmbed fetch failed — metadata skipped')
            }

            if (!title) title = 'TikTok Clip'
        } else if (!title) {
            return Err({ message: 'Title is required', code: 'VALIDATION_ERROR' })
        }

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
            title,
            description,
            image_url:   imageUrl,
            video_url:   videoUrl,
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
