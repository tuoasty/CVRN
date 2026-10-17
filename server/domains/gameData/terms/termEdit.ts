import type { Ability, ScalarValue } from '../types/datasets'
import type { AbilityBullet, GameTerm, TermBook } from './types'
import { describeAbility, type DescribeContext } from './describeAbility'
import { TEMPLATE_PLACEHOLDERS, unknownPlaceholders } from './template'
import type { TermUsage } from './termUsage'

export interface TermChange {
    ability: string
    before: string[]
    after: string[]
}

function flatten(bullets: AbilityBullet[]): string[] {
    return bullets.flatMap(b => [b.text, ...(b.children ?? []).map(c => `  ${c.text}`)])
}

export function withDrafts(terms: TermBook, drafts: GameTerm[]): TermBook {
    const book: TermBook = { effects: terms.effects, params: terms.params, options: terms.options }
    for (const draft of drafts) {
        const key = draft.kind === 'effect' ? 'effects' : draft.kind === 'param' ? 'params' : 'options'
        book[key] = new Map(book[key]).set(draft.tag, draft)
    }
    return book
}

export function withDraft(terms: TermBook, draft: GameTerm): TermBook {
    return withDrafts(terms, [draft])
}

export function previewTermChanges(abilities: Ability[], context: DescribeContext, drafts: GameTerm[]): TermChange[] {
    if (drafts.length === 0) return []
    const next: DescribeContext = { ...context, terms: withDrafts(context.terms, drafts) }
    const changes: TermChange[] = []
    for (const ability of abilities) {
        const before = flatten(describeAbility(ability, context))
        const after = flatten(describeAbility(ability, next))
        if (before.length !== after.length || before.some((line, i) => line !== after[i])) changes.push({ ability: ability.key, before, after })
    }
    return changes
}

export function previewTermChange(abilities: Ability[], context: DescribeContext, draft: GameTerm): TermChange[] {
    return previewTermChanges(abilities, context, [draft])
}

export function termChanged(stored: GameTerm | undefined, draft: GameTerm): boolean {
    if (!stored) return true
    return draft.label !== stored.label || draft.unit !== stored.unit || draft.template !== stored.template || draft.grants !== stored.grants
}

export function normalizeTermDraft(draft: GameTerm): GameTerm {
    const clean = (value: string | null) => {
        const trimmed = value?.trim() ?? ''
        return trimmed === '' ? null : trimmed
    }
    return { ...draft, label: clean(draft.label), unit: clean(draft.unit), template: clean(draft.template), grants: clean(draft.grants) }
}

export function validateTermDraft(draft: GameTerm, abilityKeys: ReadonlySet<string>): string[] {
    const term = normalizeTermDraft(draft)
    const errors = unknownPlaceholders(term.template ?? '').map(name => `Unknown placeholder {${name}}`)
    if (term.kind === 'effect' && term.label === null) errors.push('Effects need a label')
    if (term.kind !== 'effect' && term.template === null) errors.push('Wording is required')
    if (term.grants !== null) {
        const wanted = term.grants.toLowerCase()
        if (![...abilityKeys].some(key => key.toLowerCase() === wanted)) errors.push(`No ability called "${term.grants}"`)
    }
    return errors
}

export function lineNeedsAttention(bullets: AbilityBullet[]): boolean {
    return bullets.some(b => b.guess || !b.mapped || (b.children ? lineNeedsAttention(b.children) : false))
}

const PLACEHOLDER_NAMES = Object.keys(TEMPLATE_PLACEHOLDERS)

export function unseenValue(usage: TermUsage | undefined, template: string | null, value: ScalarValue): boolean {
    if (!usage || template === null) return false
    if (PLACEHOLDER_NAMES.some(name => template.includes(`{${name}}`))) return false
    return usage.examples.length > 1 && value !== usage.examples[0]
}
