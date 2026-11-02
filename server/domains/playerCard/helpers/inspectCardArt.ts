import sharp from 'sharp'
import { Err, Ok, Result } from '@/shared/types/result'
import { CARD_ART_MAX_PIXELS } from '../types'

const notPng = () => Err({ message: 'Art must be a PNG file', code: 'VALIDATION_ERROR' as const })

export async function inspectCardArt(bytes: Buffer): Promise<Result<{ width: number; height: number }>> {
    try {
        const { format, width, height } = await sharp(bytes, { limitInputPixels: false }).metadata()
        if (format !== 'png' || !width || !height) return notPng()
        if (width * height > CARD_ART_MAX_PIXELS) {
            return Err({ message: `${width} × ${height} is too large. Art can be up to 16 megapixels.`, code: 'VALIDATION_ERROR' })
        }
        return Ok({ width, height })
    } catch {
        return notPng()
    }
}
