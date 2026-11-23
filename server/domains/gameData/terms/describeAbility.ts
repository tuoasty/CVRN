import type { Ability, AbilityEffect, ScalarValue, ServeStyleValue } from '../types/datasets'
import { TERM_CATEGORIES, type AbilityBullet, type TermBook } from './types'
import { describeEffectGeneric, renderTemplate } from './template'
import { fmt, humanize } from './format'

export const SKIPPED_OPTIONS = new Set(['Group'])

export interface OptionWording {
    text: string | null
    mapped: boolean
    guess: boolean
}

export function describeOption(key: string, value: ScalarValue, terms: TermBook): OptionWording {
    const term = terms.options.get(key)
    if (!term || term.template === null) return { text: `${humanize(key).toLowerCase()}: ${value}`, mapped: false, guess: false }
    const guess = !term.verified
    if (value === false) return { text: null, mapped: true, guess }
    if (value === true) return { text: term.template, mapped: true, guess }
    return { text: renderTemplate(term.template, value), mapped: true, guess }
}

export type AbilityLookup = (name: string) => Ability | undefined

export interface DescribeContext {
    terms: TermBook
    lookup?: AbilityLookup
}

export function createAbilityLookup(abilities: Ability[]): AbilityLookup {
    const byName = new Map(abilities.map(a => [a.key.toLowerCase(), a]))
    return name => byName.get(name.toLowerCase())
}

export function describeAbility(ability: Ability, context: DescribeContext): AbilityBullet[] {
    return describe(ability, context, true)
}

function describe(ability: Ability, context: DescribeContext, expandGrants: boolean): AbilityBullet[] {
    const { terms, lookup } = context
    const bullets: AbilityBullet[] = []

    for (const effect of ability.effects) bullets.push(describeEffect(effect, terms))

    for (const [tag, v] of Object.entries(ability.params)) {
        const term = terms.params.get(tag)
        if (!term || term.template === null) {
            bullets.push({ category: 'special', text: v === 1 || v === true ? humanize(tag) : `${humanize(tag)}: ${v}`, source: 'param', tag, mapped: false, guess: false })
            continue
        }
        const bullet: AbilityBullet = { category: term.category, text: renderTemplate(term.template, v), source: 'param', tag, mapped: true, guess: !term.verified }
        if (term.grants) {
            bullet.grants = term.grants
            const granted = lookup?.(term.grants)
            if (granted && expandGrants) bullet.children = describe(granted, context, false)
        }
        bullets.push(bullet)
    }

    for (const name of ability.team ?? []) {
        bullets.push({ category: 'team', text: `Teammates get ${name}`, source: 'team', mapped: true, guess: false })
    }
    for (const name of ability.aura ?? []) {
        bullets.push({ category: 'team', text: `Aura: teammates get ${name}`, source: 'aura', mapped: true, guess: false })
    }

    const order = (b: AbilityBullet) => TERM_CATEGORIES.indexOf(b.category)
    const sorted = bullets.map((b, i) => ({ b, i })).sort((x, y) => order(x.b) - order(y.b) || x.i - y.i).map(x => x.b)

    return [...describeActivation(ability), ...sorted]
}

export function describeEffectMain(effect: AbilityEffect, terms: TermBook): string {
    const term = terms.effects.get(effect.tag)
    if (term?.template) return renderTemplate(term.template, effect.amount)
    return describeEffectGeneric(term?.label ?? humanize(effect.tag).toLowerCase(), effect.amount, effect.op, term?.unit)
}

function describeEffect(effect: AbilityEffect, terms: TermBook): AbilityBullet {
    const term = terms.effects.get(effect.tag)
    const main = describeEffectMain(effect, terms)

    const qualifiers: string[] = []
    let guess = !!term && !term.verified
    let mapped = !!term
    for (const [key, v] of Object.entries(effect.options ?? {})) {
        if (SKIPPED_OPTIONS.has(key)) continue
        const option = describeOption(key, v, terms)
        if (option.text) qualifiers.push(option.text)
        if (!option.mapped) mapped = false
        if (option.guess) guess = true
    }

    return {
        category: term?.category ?? 'special',
        text: qualifiers.length > 0 ? `${main} (${qualifiers.join(', ')})` : main,
        source: 'effect',
        tag: effect.tag,
        mapped,
        guess,
    }
}

function describeActivation(ability: Ability): AbilityBullet[] {
    const bullets: AbilityBullet[] = []
    const add = (text: string, source: 'active' | 'toggle') =>
        bullets.push({ category: 'special', text, source, mapped: true, guess: false })

    const active = ability.active
    if (active) {
        const parts = [active.auto ? 'Activates itself when ready' : 'Active ability']
        if (active.duration !== undefined) parts.push(`lasts ${fmt(active.duration)}s`)
        if (active.cooldown !== undefined) parts.push(`${fmt(active.cooldown)}s cooldown`)
        add(parts.join(', '), 'active')
        if (active.grounded) add('Must be on the ground', 'active')
    }

    if (ability.toggle) {
        add(`Toggle, ${ability.toggle.defaultOn ? 'on' : 'off'} by default`, 'toggle')
        if (ability.paramsAlways) add('Its perks stay on while toggled off', 'toggle')
    }

    return bullets
}

export function unmappedStyleTags(values: ServeStyleValue[], terms: TermBook): { kind: 'param'; tag: string; uses: number }[] {
    return values.filter(v => !terms.params.get(v.key)?.template).map(v => ({ kind: 'param' as const, tag: v.key, uses: 1 }))
}

export function unmappedTags(abilities: Ability[], terms: TermBook): { kind: 'effect' | 'param' | 'option'; tag: string; uses: number }[] {
    const counts = new Map<string, { kind: 'effect' | 'param' | 'option'; tag: string; uses: number }>()
    const bump = (kind: 'effect' | 'param' | 'option', tag: string) => {
        const id = `${kind}:${tag}`
        const entry = counts.get(id) ?? { kind, tag, uses: 0 }
        entry.uses++
        counts.set(id, entry)
    }
    for (const ability of abilities) {
        for (const effect of ability.effects) {
            if (!terms.effects.has(effect.tag)) bump('effect', effect.tag)
            for (const key of Object.keys(effect.options ?? {})) {
                if (!SKIPPED_OPTIONS.has(key) && !terms.options.get(key)?.template) bump('option', key)
            }
        }
        for (const tag of Object.keys(ability.params)) {
            if (!terms.params.get(tag)?.template) bump('param', tag)
        }
    }
    return [...counts.values()]
}
