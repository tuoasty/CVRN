import type { EffectOp, ScalarValue } from '../types/datasets'

export const TERM_CATEGORIES = ['jump', 'movement', 'attack', 'block', 'receive', 'set', 'serve', 'stamina', 'team', 'special'] as const
export type TermCategory = (typeof TERM_CATEGORIES)[number]

export interface EffectTerm {
    category: TermCategory
    label: string
    unit?: string
    describe?: (amount: number, op: EffectOp) => string
    guess?: true
}

export interface ParamTerm {
    category: TermCategory
    describe: (value: ScalarValue) => string
    grants?: string
    guess?: true
}

export interface OptionTerm {
    describe: (value: ScalarValue) => string | null
    guess?: true
}

export type BulletSource = 'effect' | 'param' | 'active' | 'toggle' | 'team' | 'aura'

export interface AbilityBullet {
    category: TermCategory
    text: string
    source: BulletSource
    tag?: string
    mapped: boolean
    guess: boolean
    grants?: string
    children?: AbilityBullet[]
}
