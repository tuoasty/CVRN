import type { BuildCombo } from './datasets'

export interface BuildIndexCombo extends BuildCombo {
    minInches: number
    maxInches: number
}

export type ResolvedBuildEffect =
    | { type: 'ability'; name: string; key: string }
    | { type: 'variant'; name: string; base: string; modifier: string }
    | { type: 'text'; name: string }
    | { type: 'bonus'; name: string; key?: string }

export interface BuildIndexEntry {
    name: string
    rarity: string
    combos: BuildIndexCombo[]
    effects: ResolvedBuildEffect[]
    hasEffects: boolean
}

export interface HeightOdds {
    value: number
    inches: number
    label: string
    weight: number
    pct: number
}
