import sharp from 'sharp'
import { Err, Ok, Result } from '@/shared/types/result'
import { logger } from '@/server/utils/logger'
import { createByteCache } from './byteCache'

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000
const CACHE_MAX_BYTES = 50 * 1024 * 1024

const cache = createByteCache({ maxBytes: CACHE_MAX_BYTES, ttlMs: CACHE_TTL_MS })

export async function loadImageAsPngDataUri(url: string): Promise<Result<string>> {
    try {
        const response = await fetch(url)
        if (!response.ok) {
            return Err({ message: `Failed to fetch card image (${response.status})`, code: 'INTEGRATION_ERROR' })
        }
        const png = await sharp(Buffer.from(await response.arrayBuffer())).png().toBuffer()
        return Ok(`data:image/png;base64,${png.toString('base64')}`)
    } catch (error) {
        logger.error({ error, url }, 'loadImageAsPngDataUri: failed')
        return Err({ message: 'Failed to load card image', code: 'INTEGRATION_ERROR' })
    }
}

export async function loadImageCached(url: string): Promise<Result<string>> {
    const hit = cache.get(url)
    if (hit !== undefined) return Ok(hit)

    const loaded = await loadImageAsPngDataUri(url)
    if (loaded.ok) cache.set(url, loaded.value)
    return loaded
}
