import type { EffectOp, ScalarValue } from '../types/datasets'
import type { GameTerm, TermBook } from './types'
import { capitalize, fmt, num, pct, pctChange, withUnit } from './format'
import { formatGameHeight } from '@/shared/utils/height'

export const TEMPLATE_PLACEHOLDERS = {
    v: (value: ScalarValue) => fmt(num(value)),
    pct: (value: ScalarValue) => pct(num(value)),
    pctChange: (value: ScalarValue) => String(pctChange(num(value))),
    inverse: (value: ScalarValue) => fmt(1 / num(value)),
    height: (value: ScalarValue) => formatGameHeight(num(value)),
    text: (value: ScalarValue) => String(value).toLowerCase(),
} as const

export type TemplatePlaceholder = keyof typeof TEMPLATE_PLACEHOLDERS

const PLACEHOLDER = /\{(\w+)\}/g

export function renderTemplate(template: string, value: ScalarValue): string {
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
    const book: TermBook = { effects: new Map(), params: new Map(), options: new Map() }
    for (const term of terms) termMap(book, term.kind).set(term.tag, term)
    return book
}

export function termMap(book: TermBook, kind: GameTerm['kind']): Map<string, GameTerm> {
    return kind === 'effect' ? book.effects : kind === 'param' ? book.params : book.options
}

export const EMPTY_TERM_BOOK: TermBook = { effects: new Map(), params: new Map(), options: new Map() }
