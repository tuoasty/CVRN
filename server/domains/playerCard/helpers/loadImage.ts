import sharp from 'sharp'
import { Err, Ok, Result } from '@/shared/types/result'
import { logger } from '@/server/utils/logger'

const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_MAX_ENTRIES = 40

const cache = new Map<string, { at: number; value: string }>()

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
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return Ok(hit.value)

    const loaded = await loadImageAsPngDataUri(url)
    if (!loaded.ok) return loaded

    cache.delete(url)
    cache.set(url, { at: Date.now(), value: loaded.value })
    while (cache.size > CACHE_MAX_ENTRIES) {
        const oldest = cache.keys().next().value
        if (oldest === undefined) break
        cache.delete(oldest)
    }
    return loaded
}
