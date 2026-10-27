import { isPositionCode, normalizePositionInput, positionShortLabel, type PositionCode } from '@/shared/volleyball/positions'

export const CUSTOM_GALLERY = 'CUSTOM' as const

export type GalleryKey = PositionCode | typeof CUSTOM_GALLERY

export function parseGalleryKey(raw: string | null | undefined): GalleryKey {
    if (raw?.trim().toUpperCase() === CUSTOM_GALLERY) return CUSTOM_GALLERY
    return normalizePositionInput(raw ?? '') ?? 'OUT'
}

export function galleryLabel(key: GalleryKey): string {
    return key === CUSTOM_GALLERY ? 'Custom' : positionShortLabel(key)
}

export function galleryHref(key: GalleryKey): string {
    return key === 'OUT' ? '/information/specs' : `/information/specs?pos=${key.toLowerCase()}`
}

export function galleryKeyOf(spec: { is_custom: boolean; position: string | null }): GalleryKey {
    if (spec.is_custom) return CUSTOM_GALLERY
    return spec.position && isPositionCode(spec.position) ? spec.position : 'OUT'
}
