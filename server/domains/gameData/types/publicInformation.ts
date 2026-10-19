import type { EffectOp, KitSlot } from './datasets'
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

export interface PublicKitEntry {
    name: string
    slot: KitSlot
    target?: string
    tuned?: TunedInspector
}

export interface PublicSpecKit {
    cooldown: number
    lifetime?: number
    active: PublicKitEntry[]
    passive: PublicKitEntry[]
}

export interface PublicBuildCombo {
    physical: string
    physicalSlug: string
    technical: string
    technicalSlug: string
    minInches: number
    maxInches: number
    heightLabel: string
}

export type PublicBuildEffect =
    | { kind: 'text'; text: string }
    | { kind: 'ability'; name: string; target: string }
    | { kind: 'bonus'; name: string; target?: string }

export interface PublicBuildPart {
    name: string
    role: 'Physical' | 'Technical' | 'Bonus'
    wording: string[]
    href?: string
}

export interface PublicBuild {
    name: string
    slug: string
    rarity: string
    combos: PublicBuildCombo[]
    effects: PublicBuildEffect[]
    parts: PublicBuildPart[]
}

export interface PickOption {
    slug: string
    name: string
    rarity: string
}

export interface PublicBuildCatalog {
    groups: { rarity: string; builds: PublicBuild[] }[]
    physicals: PickOption[]
    technicals: PickOption[]
    heights: HeightRow[]
}

export interface PublicInformation {
    abilities: PublicAbilityCatalog
    inspectors: Record<string, InspectorData>
    heights: HeightColumn[]
    kits: Record<string, PublicSpecKit>
    builds: PublicBuildCatalog
}
