import sharp from 'sharp'
import { CARD_ART_MAX_PIXELS, RigPlacement } from '../types'
import { RigBox, rigImageHeight, RigImageSize } from './rigPlacement'

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

export async function cropRigToBox(bytes: Buffer, image: RigImageSize, placement: RigPlacement, box: RigBox): Promise<Buffer> {
    const boxW = Math.round(box.w)
    const boxH = Math.round(box.h)
    const { imageX: x, imageY: y, imageW: w } = placement
    const h = rigImageHeight(placement, image)
    const empty = sharp({ create: { width: boxW, height: boxH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })

    const left = Math.max(x, 0)
    const top = Math.max(y, 0)
    const right = Math.min(x + w, boxW)
    const bottom = Math.min(y + h, boxH)
    if (right <= left || bottom <= top) return empty.png().toBuffer()

    const perPixelX = image.width / w
    const perPixelY = image.height / h
    const sourceLeft = clamp(Math.floor((left - x) * perPixelX), 0, image.width - 1)
    const sourceTop = clamp(Math.floor((top - y) * perPixelY), 0, image.height - 1)

    const piece = await sharp(bytes, { limitInputPixels: CARD_ART_MAX_PIXELS })
        .extract({
            left: sourceLeft,
            top: sourceTop,
            width: clamp(Math.ceil((right - left) * perPixelX), 1, image.width - sourceLeft),
            height: clamp(Math.ceil((bottom - top) * perPixelY), 1, image.height - sourceTop),
        })
        .resize(right - left, bottom - top, { fit: 'fill' })
        .png()
        .toBuffer()

    return empty.composite([{ input: piece, left, top }]).png().toBuffer()
}
