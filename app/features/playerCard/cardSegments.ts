import { CARD_STAT_LABELS } from '@/server/domains/playerCard/types/schemas'
import type { CardLayer } from '@/server/domains/playerCard'

type TextField = Extract<CardLayer, { kind: 'text' }>['field']
type ImageField = Extract<CardLayer, { kind: 'image' }>['field']

export const STAT_ORDER = ['spiking', 'scoring', 'blocking', 'setting', 'receiving', 'serving'] as const

const textLayer = (field: TextField, w: number, h: number, size: number, text?: string): CardLayer => ({
    kind: 'text', field, x: 40, y: 40, w, h, size, color: '#ffffff', statOrder: 'valueFirst', uppercase: false, letterSpacing: 0,
    ...(text !== undefined ? { text } : {}),
})

export const makeCustomTextLayer = () => textLayer('custom', 180, 40, 32, 'OVR')

const imageLayer = (field: ImageField, w: number, h: number, fit: 'contain' | 'cover'): CardLayer => ({
    kind: 'image', field, x: 40, y: 40, w, h, fit,
})

export const CARD_SEGMENTS: { field: TextField | ImageField; label: string; make: () => CardLayer }[] = [
    { field: 'ovr', label: 'OVR', make: () => textLayer('ovr', 180, 120, 110) },
    { field: 'position', label: 'Position', make: () => textLayer('position', 180, 60, 48) },
    { field: 'teamLogo', label: 'Team', make: () => imageLayer('teamLogo', 120, 120, 'contain') },
    { field: 'headshot', label: 'Avatar', make: () => imageLayer('headshot', 500, 500, 'cover') },
    { field: 'username', label: 'Name', make: () => textLayer('username', 700, 90, 72) },
    ...STAT_ORDER.map(field => ({ field, label: CARD_STAT_LABELS[field], make: () => textLayer(field, 200, 56, 44) })),
]

const EXTRA_LABELS: Record<string, string> = { displayName: 'Display name', teamName: 'Team name' }

export function isStatLayer(layer: CardLayer): boolean {
    return layer.kind === 'text' && (STAT_ORDER as readonly string[]).includes(layer.field)
}

export function layerLabel(layer: CardLayer): string {
    if (layer.kind === 'art') return `Art · ${layer.src.split('/').pop()}`
    if (layer.kind === 'text' && layer.field === 'custom') return `Text · ${layer.text?.trim() || 'empty'}`
    return CARD_SEGMENTS.find(s => s.field === layer.field)?.label ?? EXTRA_LABELS[layer.field] ?? layer.field
}

export function layerProblem(layer: CardLayer): string | null {
    if (!(layer.w > 0) || !(layer.h > 0)) return 'Width and height must be above 0'
    if (layer.kind === 'text' && !(layer.size > 0)) return 'Size must be above 0'
    if (layer.kind === 'text' && layer.field === 'custom' && !layer.text?.trim()) return 'Custom text cannot be blank'
    return null
}
