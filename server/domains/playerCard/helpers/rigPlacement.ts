import type { RigPlacement } from '../types/schemas'

export interface RigImageSize {
    width: number
    height: number
}

export interface RigBox {
    w: number
    h: number
}

export function defaultRigPlacement(image: RigImageSize, box: RigBox): RigPlacement {
    const boxW = Math.round(box.w)
    const boxH = Math.round(box.h)
    const zoom = Math.max(boxW / image.width, boxH / image.height)
    const width = image.width * zoom
    const height = image.height * zoom
    return {
        imageX: Math.round((boxW - width) / 2),
        imageY: Math.round((boxH - height) / 2),
        imageW: Math.round(width),
    }
}

export function rigImageHeight(placement: Pick<RigPlacement, 'imageW'>, image: RigImageSize): number {
    return Math.round(placement.imageW * image.height / image.width)
}
