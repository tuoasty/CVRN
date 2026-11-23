export const GAME_DATASET_KINDS = ['rarities', 'abilities', 'physicals', 'technicals', 'heights', 'builds', 'buildPassives', 'specLoadouts', 'serveStyles', 'serveStyleValues', 'specLoadoutsPaid'] as const
export type GameDatasetKind = (typeof GAME_DATASET_KINDS)[number]

export type ScalarValue = string | number | boolean
export type PlainValue = ScalarValue | null | PlainValue[] | { [key: string]: PlainValue }

export interface Rarity {
    name: string
    color: string
    weight: number
    normalPct: number
    luckyPct: number
}

export type EffectOp = 'add' | 'set' | 'scale'

export interface AbilityEffect {
    op: EffectOp
    tag: string
    amount: number
    options?: Record<string, ScalarValue>
}

export interface AbilityActive {
    cooldown?: number
    duration?: number
    behaviour?: string
    grounded?: boolean
    auto?: boolean
    extra?: Record<string, PlainValue>
}

export interface AbilityToggle {
    name: string
    defaultOn: boolean
}

export interface Ability {
    key: string
    description?: string
    group?: string
    effects: AbilityEffect[]
    params: Record<string, ScalarValue>
    paramsAlways?: boolean
    active?: AbilityActive
    toggle?: AbilityToggle
    team?: string[]
    aura?: string[]
    teamSlot?: string
    extra?: Record<string, PlainValue>
}

export interface AttributeEntry {
    value: string
    weight: number
}

export interface HeightEntry {
    value: number
    weight: number
}

export interface BuildCombo {
    physical: string
    technical: string
    minHeight: number
    maxHeight: number
}

export interface Build {
    name: string
    rarity: string
    combos: BuildCombo[]
}

export const KNOWN_BUILD_STATS = ['MaxPower', 'FlexMaxPower'] as const

export type BuildEffect =
    | { type: 'named'; name: string }
    | { type: 'bonus'; slot: string; name: string }
    | { type: 'stat'; field: string; value: number }

export interface BuildPassives {
    build: string
    effects: BuildEffect[]
}

export type KitSlot = 'Passive' | 'Active'

export interface SpecTune {
    slot: KitSlot
    ability: string
    path: string
    value: number
}

export interface ServeStyle {
    name: string
}

export interface ServeStyleValue {
    key: string
    value: number
}

export interface SpecStyle {
    name: string
    value: number
}

export interface SpecLoadout {
    key: string
    name: string
    height: number
    cooldown: number
    lifetime?: number
    endOnSpike: boolean
    maxPower: number
    activeMaxPower: number
    passive: string[]
    active: string[]
    tuning: SpecTune[]
    styles: SpecStyle[]
    extra?: Record<string, PlainValue>
}

export interface GameDatasetPayloads {
    rarities: Rarity[]
    abilities: Ability[]
    physicals: AttributeEntry[]
    technicals: AttributeEntry[]
    heights: HeightEntry[]
    builds: Build[]
    buildPassives: BuildPassives[]
    specLoadouts: SpecLoadout[]
    serveStyles: ServeStyle[]
    serveStyleValues: ServeStyleValue[]
    specLoadoutsPaid: SpecLoadout[]
}

export type IssueLevel = 'error' | 'warning'

export interface DatasetIssue {
    level: IssueLevel
    message: string
    kind?: GameDatasetKind
    entry?: string
}

export interface DatasetDiff {
    added: string[]
    removed: string[]
    changed: string[]
    reordered: boolean
    unchanged: boolean
}

export interface StoredDatasetSummary {
    kind: GameDatasetKind
    count: number
    importedAt: string
}

export interface NormalizeResult<T> {
    payload: T[]
    issues: DatasetIssue[]
}
