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
    { key: 'teamName', label: 'Team name', make: () => textLayer('teamName', 500, 60, 40) },
    { key: 'headshot', label: 'Avatar', make: () => imageLayer('headshot', 500, 500, 'cover') },
    { key: 'username', label: 'Name', make: () => textLayer('username', 700, 90, 72) },
    { key: 'displayName', label: 'Display name', make: () => textLayer('displayName', 700, 60, 40) },
    { key: 'stats', label: 'Stats', make: statsLayer },
    { key: 'season', label: 'Season', make: () => textLayer('season', 180, 40, 32) },
]

export function layerLabel(layer: CardLayer): string {
    if (layer.kind === 'art') return `Art · ${layer.src}`
    if (layer.kind === 'text' && layer.field === 'custom') return `Text · ${layer.text?.trim() || 'empty'}`
    const key = segmentKey(layer) ?? ''
    return CARD_SEGMENTS.find(s => s.key === key)?.label ?? key
}

export function layerProblem(layer: CardLayer): string | null {
    if (!(layer.w > 0) || !(layer.h > 0)) return 'Width and height must be above 0'
    if ((layer.kind === 'text' || layer.kind === 'stats') && !(layer.size > 0)) return 'Size must be above 0'
    if (layer.kind === 'text' && layer.field === 'custom' && !layer.text?.trim()) return 'Custom text cannot be blank'
    return null
}

export function moveLayer(layers: CardLayer[], index: number, delta: number): CardLayer[] {
    const target = index + delta
    if (index < 0 || index >= layers.length || target < 0 || target >= layers.length) return layers
    if (layers[index].kind === 'art' || layers[target].kind === 'art') return layers
    const next = [...layers]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    return next
}

export function colorInputValue(color: string): string {
    const value = color.trim().toLowerCase()
    if (/^#[0-9a-f]{6}$/.test(value)) return value
    if (/^#[0-9a-f]{3}$/.test(value)) return `#${[...value.slice(1)].map(c => c + c).join('')}`
    return '#ffffff'
}
