import type { EffectOp } from './datasets'
import type { HeightOdds } from './buildIndex'

export type PublicAbilityKind = 'physical' | 'technical'

export interface SheetRow {
    label: string
    value: string
    op: EffectOp
    unit?: string
    was?: string
}

export interface InspectorData {
    key: string
    name: string
    kind: PublicAbilityKind | 'exclusive'
    rarity?: string
    sheet?: SheetRow[]
    text?: string
    lines?: string[]
    href?: string
}

export interface TunedInspector extends InspectorData {
    tuned?: string[]
}

export type AbilityMarker = { kind: 'active'; cooldown?: number } | { kind: 'toggle' } | null

export interface PublicAbilityLine {
    text: string
    grants?: string
}

export interface PublicAbility {
    key: string
    slug: string
    kind: PublicAbilityKind
    rarity: string
    marker: AbilityMarker
    summary: string
    source: 'original' | 'derived'
    text?: string
    lines: PublicAbilityLine[]
}

export interface RarityGroup {
    rarity: string
    normalPct: number
    luckyPct: number
    abilities: PublicAbility[]
}

export interface PublicAbilityCatalog {
    physical: RarityGroup[]
    technical: RarityGroup[]
}

export type HeightRow = HeightOdds & { fill: number; game: string }

export interface HeightColumn {
    foot: 5 | 6 | 7
    rows: HeightRow[]
}

export interface PublicInformation {
    abilities: PublicAbilityCatalog
    inspectors: Record<string, InspectorData>
    heights: HeightColumn[]
}
