export const GAME_DATASET_KINDS = ['rarities', 'abilities', 'physicals', 'technicals'] as const
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

export interface GameDatasetPayloads {
    rarities: Rarity[]
    abilities: Ability[]
    physicals: AttributeEntry[]
    technicals: AttributeEntry[]
}

export type IssueLevel = 'error' | 'warning'

export interface DatasetIssue {
    level: IssueLevel
    message: string
    kind?: GameDatasetKind
    entry?: string
}

export interface NormalizeResult<T> {
    payload: T[]
    issues: DatasetIssue[]
}
