import type { CardArtFile, CardLayer } from '@/server/domains/playerCard'
import { CARD_ART_MAX_BYTES, CARD_ART_MAX_PIXELS } from '@/server/domains/playerCard/types/schemas'

export interface ArtSlot {
    name: string
    w: number
    h: number
}

const SHAPE_TOLERANCE = 0.01
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const IHDR = [0x49, 0x48, 0x44, 0x52]

export function layoutArtSlots(layers: CardLayer[]): ArtSlot[] {
    const slots = new Map<string, ArtSlot>()
    for (const layer of layers) {
        if (layer.kind === 'art' && !slots.has(layer.src)) slots.set(layer.src, { name: layer.src, w: layer.w, h: layer.h })
    }
    return [...slots.values()]
}

export function missingArt(layers: CardLayer[], files: Pick<CardArtFile, 'name'>[]): string[] {
    return layoutArtSlots(layers).map(slot => slot.name).filter(name => !files.some(file => file.name === name))
}

export function tierHasArt(layers: CardLayer[], files: Pick<CardArtFile, 'name'>[]): boolean {
    return layoutArtSlots(layers).length > 0 && missingArt(layers, files).length === 0
}

export function artFitWarning(image: { width: number; height: number }, box: { w: number; h: number }): string | null {
    const shape = Math.abs(image.width / image.height - box.w / box.h) / (box.w / box.h) > SHAPE_TOLERANCE
    const small = image.width < box.w || image.height < box.h
    if (!shape && !small) return null
    const size = `${box.w} × ${box.h}`
    if (shape && small) return `Different shape and smaller than its ${size} box, so it will stretch and look soft`
    return shape ? `Different shape from its ${size} box, so it will stretch` : `Smaller than its ${size} box, so it will look soft`
}

export function readPngSize(header: Uint8Array): { width: number; height: number } | null {
    if (header.length < 24) return null
    if (PNG_SIGNATURE.some((byte, i) => header[i] !== byte)) return null
    if (IHDR.some((byte, i) => header[12 + i] !== byte)) return null
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength)
    return { width: view.getUint32(16), height: view.getUint32(20) }
}

export async function checkArtFile(file: File): Promise<string | null> {
    if (file.size > CARD_ART_MAX_BYTES) return 'Art must be 2.9 MB or smaller. It is stored as uploaded, so export a smaller PNG.'
    const size = readPngSize(new Uint8Array(await file.slice(0, 24).arrayBuffer()))
    if (!size) return 'Art must be a PNG file'
    if (size.width * size.height > CARD_ART_MAX_PIXELS) return `${size.width} × ${size.height} is too large. Art can be up to 16 megapixels.`
    return null
}

export function formatArtSize(bytes: number): string {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function tierRangeLabels<T extends { minOvr: number }>(templates: T[]): { template: T; label: string }[] {
    return templates.map((template, i) => {
        const max = i === 0 ? 99 : templates[i - 1].minOvr - 1
        const label = max <= template.minOvr ? `${template.minOvr}` : max === 99 ? `${template.minOvr}+` : `${template.minOvr}–${max}`
        return { template, label }
    })
}

export function pickPreviewImage(p: {
    hasRequest: boolean
    error: unknown
    data: string | undefined
    last: { scope: string; image: string } | null
    scope: string
}): string | null {
    if (!p.hasRequest || p.error) return null
    if (p.data) return p.data
    return p.last?.scope === p.scope ? p.last.image : null
}

export function generateBlocker(p: {
    notReady: string | null
    inputProblem: string | null
    inactiveGroup: string | null
    noTier: string | null
    previewingTier: string | null
    dirty: boolean
    layoutProblem: string | null
    layers: CardLayer[]
    tierName: string | null
    missing: string[]
    bulkRunning?: string | null
}): string | null {
    if (p.bulkRunning) return p.bulkRunning
    if (p.notReady) return p.notReady
    if (p.inputProblem) return p.inputProblem
    if (p.inactiveGroup) return p.inactiveGroup
    if (p.previewingTier) return `Previewing ${p.previewingTier}. Go back to the player's tier to generate.`
    if (p.noTier) return p.noTier
    if (p.dirty) return 'Save or discard layout changes before generating'
    if (p.layoutProblem) return p.layoutProblem
    if (layoutArtSlots(p.layers).length === 0) return 'This layout has no art layer, so a card would have no background'
    if (p.missing.length > 0) return `${p.tierName} has no ${p.missing.join(', ')} yet. Upload it on Card Groups.`
    return null
}
