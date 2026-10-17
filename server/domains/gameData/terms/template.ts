import type { EffectOp } from '../types/datasets'
import type { GameTerm, TermBook } from './types'
import { capitalize, fmt, pct, pctChange, withUnit } from './format'

export const TEMPLATE_PLACEHOLDERS = {
    v: (value: number) => fmt(value),
    pct: (value: number) => pct(value),
    pctChange: (value: number) => String(pctChange(value)),
    inverse: (value: number) => fmt(1 / value),
} as const

export type TemplatePlaceholder = keyof typeof TEMPLATE_PLACEHOLDERS

const PLACEHOLDER = /\{(\w+)\}/g

export function renderTemplate(template: string, value: number): string {
    return template.replace(PLACEHOLDER, (whole, name: string) =>
        name in TEMPLATE_PLACEHOLDERS ? TEMPLATE_PLACEHOLDERS[name as TemplatePlaceholder](value) : whole,
    )
}

export function unknownPlaceholders(template: string): string[] {
    return [...template.matchAll(PLACEHOLDER)].map(m => m[1]).filter(name => !(name in TEMPLATE_PLACEHOLDERS))
}

export function describeEffectGeneric(label: string, amount: number, op: EffectOp, unit?: string | null): string {
    if (op === 'set') return `${capitalize(label)} set to ${withUnit(amount, unit ?? undefined)}`
    if (op === 'scale') return `${amount >= 1 ? 'Increased' : 'Reduced'} ${label} by ${pctChange(amount)}%`
    return `${amount >= 0 ? 'Increased' : 'Reduced'} ${label} by ${withUnit(Math.abs(amount), unit ?? undefined)}`
}

export function createTermBook(terms: GameTerm[]): TermBook {
    const book: TermBook = { effects: new Map(), params: new Map() }
    for (const term of terms) (term.kind === 'effect' ? book.effects : book.params).set(term.tag, term)
    return book
}

export const EMPTY_TERM_BOOK: TermBook = { effects: new Map(), params: new Map() }
