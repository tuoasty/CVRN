import type { Ability, ScalarValue } from '../types/datasets'
import type { TermBook, TermKind } from './types'
import { SKIPPED_OPTIONS } from './describeAbility'
import { termMap } from './template'

const MAX_EXAMPLES = 5

export interface TermUsage {
    kind: TermKind
    tag: string
    uses: number
    abilities: string[]
    examples: ScalarValue[]
}

export function termId(kind: TermKind, tag: string): string {
    return `${kind}:${tag}`
}

export function collectTermUsage(abilities: Ability[]): Map<string, TermUsage> {
    const usage = new Map<string, TermUsage>()
    const add = (kind: TermKind, tag: string, ability: string, value: ScalarValue) => {
        const id = termId(kind, tag)
        let entry = usage.get(id)
        if (!entry) {
            entry = { kind, tag, uses: 0, abilities: [], examples: [] }
            usage.set(id, entry)
        }
        entry.uses++
        if (!entry.abilities.includes(ability)) entry.abilities.push(ability)
        if (entry.examples.length < MAX_EXAMPLES && !entry.examples.includes(value)) entry.examples.push(value)
    }
    for (const ability of abilities) {
        for (const effect of ability.effects) {
            add('effect', effect.tag, ability.key, effect.amount)
            for (const [key, value] of Object.entries(effect.options ?? {})) {
                if (!SKIPPED_OPTIONS.has(key)) add('option', key, ability.key, value)
            }
        }
        for (const [tag, value] of Object.entries(ability.params)) add('param', tag, ability.key, value)
    }
    return usage
}

export function isTermHandled(terms: TermBook, kind: TermKind, tag: string): boolean {
    const term = termMap(terms, kind).get(tag)
    if (!term) return false
    return kind === 'effect' ? term.label !== null || term.template !== null : term.template !== null
}

export function unhandledTerms(usage: Map<string, TermUsage>, terms: TermBook): TermUsage[] {
    return [...usage.values()]
        .filter(u => !isTermHandled(terms, u.kind, u.tag))
        .sort((a, b) => b.uses - a.uses || a.tag.localeCompare(b.tag))
}
