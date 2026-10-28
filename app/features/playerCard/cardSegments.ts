import type { CardLayer } from '@/server/domains/playerCard'

type TextField = Extract<CardLayer, { kind: 'text' }>['field']
type ImageField = Extract<CardLayer, { kind: 'image' }>['field']

const textLayer = (field: TextField, w: number, h: number, size: number, text?: string): CardLayer => ({
    kind: 'text', field, x: 40, y: 40, w, h, size, color: '#ffffff', uppercase: false, letterSpacing: 0,
    ...(text !== undefined ? { text } : {}),
})

export const makeCustomTextLayer = () => textLayer('custom', 180, 40, 32, 'OVR')

const imageLayer = (field: ImageField, w: number, h: number, fit: 'contain' | 'cover'): CardLayer => ({
    kind: 'image', field, x: 40, y: 40, w, h, fit,
})

const statsLayer = (): CardLayer => ({ kind: 'stats', x: 40, y: 40, w: 420, h: 150, size: 40, color: '#ffffff', letterSpacing: 0 })

export function segmentKey(layer: CardLayer): string | null {
    if (layer.kind === 'art') return null
    if (layer.kind === 'stats') return 'stats'
    return layer.field
}

export const CARD_SEGMENTS: { key: string; label: string; make: () => CardLayer }[] = [
    { key: 'ovr', label: 'OVR', make: () => textLayer('ovr', 180, 120, 110) },
    { key: 'position', label: 'Position', make: () => textLayer('position', 180, 60, 48) },
    { key: 'teamLogo', label: 'Team', make: () => imageLayer('teamLogo', 120, 120, 'contain') },
    { key: 'headshot', label: 'Avatar', make: () => imageLayer('headshot', 500, 500, 'cover') },
    { key: 'username', label: 'Name', make: () => textLayer('username', 700, 90, 72) },
    { key: 'stats', label: 'Stats', make: statsLayer },
]

const EXTRA_LABELS: Record<string, string> = { displayName: 'Display name', teamName: 'Team name' }

export function layerLabel(layer: CardLayer): string {
    if (layer.kind === 'art') return `Art · ${layer.src.split('/').pop()}`
    if (layer.kind === 'text' && layer.field === 'custom') return `Text · ${layer.text?.trim() || 'empty'}`
    const key = segmentKey(layer) ?? ''
    return CARD_SEGMENTS.find(s => s.key === key)?.label ?? EXTRA_LABELS[key] ?? key
}

export function layerProblem(layer: CardLayer): string | null {
    if (!(layer.w > 0) || !(layer.h > 0)) return 'Width and height must be above 0'
    if ((layer.kind === 'text' || layer.kind === 'stats') && !(layer.size > 0)) return 'Size must be above 0'
    if (layer.kind === 'text' && layer.field === 'custom' && !layer.text?.trim()) return 'Custom text cannot be blank'
    return null
}
