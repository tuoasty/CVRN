export const TERM_CATEGORIES = ['jump', 'movement', 'attack', 'block', 'receive', 'set', 'serve', 'stamina', 'team', 'special'] as const
export type TermCategory = (typeof TERM_CATEGORIES)[number]

export const TERM_KINDS = ['effect', 'param', 'option'] as const
export type TermKind = (typeof TERM_KINDS)[number]

export interface GameTerm {
    kind: TermKind
    tag: string
    category: TermCategory
    label: string | null
    unit: string | null
    template: string | null
    grants: string | null
    verified: boolean
    updatedBy?: string | null
    updatedAt?: string | null
}

export interface TermBook {
    effects: Map<string, GameTerm>
    params: Map<string, GameTerm>
    options: Map<string, GameTerm>
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
