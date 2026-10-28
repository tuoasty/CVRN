import sharp from 'sharp'
import { Err, Ok, Result } from '@/shared/types/result'
import { logger } from '@/server/utils/logger'

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
