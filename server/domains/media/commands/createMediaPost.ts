import { randomUUID } from 'node:crypto'
import { Err, Ok, Result } from '@/shared/types/result'
import { DBClient } from '@/shared/types/db'
import { serializeError } from '@/server/utils/serializeableError'
import { logger } from '@/server/utils/logger'
import { BUCKETS, STORAGE_PATHS } from '@/server/storage/storage.paths'
import { uploadFile, deleteFile } from '@/server/storage/storage.service'
import { insertMediaPost } from '@/server/db/mediaPost.repo'
import { assertMatchSlotFree } from '../helpers/assertMatchSlotFree'
import { assertChampionSlotFree } from '../helpers/assertChampionSlotFree'
import { getYoutubeId } from '@/shared/utils/youtube'
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

async function resolveTikTok(url: string): Promise<{ videoId: string; canonicalUrl: string } | null> {
    if (!isTikTokUrl(url)) return null

    const direct = url.match(/\/video\/(\d+)/)
    if (direct) return { videoId: direct[1], canonicalUrl: url }

    try {
        const res = await fetch(url, { redirect: 'manual' })
        const location = res.headers.get('location')
        if (!location || !isTikTokUrl(location)) return null
        const id = location.match(/\/video\/(\d+)/)?.[1]
        if (!id) return null
        return { videoId: id, canonicalUrl: location }
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
            const resolved = await resolveTikTok(p.videoUrl)
            if (!resolved) {
                return Err({ message: 'Could not extract TikTok video ID from URL. Paste a full or short TikTok link.', code: 'VALIDATION_ERROR' })
            }
            videoUrl = resolved.videoId

            try {
                const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolved.canonicalUrl)}`
                const res = await fetch(oembedUrl, {
                headers: {
                    "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
                    "Accept": "application/json",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.tiktok.com/",
                },
                redirect: "manual",
                });
                logger.debug({status:res.status, location:res.headers.get("location"), server:res.headers.get("server")}, "oEmbed fetch info")
                if (res.ok) {
                    const ct = res.headers.get('content-type') ?? ''
                    if (ct.includes('application/json') || ct.includes('text/javascript')) {
                        const data = await res.json()
                        logger.debug({ postId, data }, 'oEmbed data')
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

        if (p.type === 'feature') {
            if (!p.videoUrl || !getYoutubeId(p.videoUrl)) {
                return Err({ message: 'A feature needs a YouTube video or Shorts URL', code: 'VALIDATION_ERROR' })
            }
            if (p.matchId) {
                return Err({ message: 'Features cannot be attached to a match', code: 'VALIDATION_ERROR' })
            }
        }

        if (p.matchId && (p.type === 'gfx' || p.type === 'video')) {
            const free = await assertMatchSlotFree(supabase, p.matchId, p.type)
            if (!free.ok) return free
        }

        if (p.type === 'champion') {
            if (!p.seasonId) {
                return Err({ message: 'A season is required for a champion GFX', code: 'VALIDATION_ERROR' })
            }
            const free = await assertChampionSlotFree(supabase, p.seasonId)
            if (!free.ok) return free
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
            author_id:   p.authorId ?? null,
            match_id:    p.matchId ?? null,
            team_id:     p.teamId ?? null,
            player_id:   p.playerId ?? null,
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
