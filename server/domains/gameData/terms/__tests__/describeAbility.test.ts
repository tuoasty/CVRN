import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildImportPreview } from '../../helpers/buildImportPreview'
import { createAbilityLookup, describeAbility, describeOption, unmappedStyleTags, unmappedTags } from '../describeAbility'
import { createTermBook, EMPTY_TERM_BOOK, renderTemplate, unknownPlaceholders } from '../template'
import type { Ability } from '../../types/datasets'
import type { GameTerm } from '../types'
import { gameHeightToInches } from '@/shared/utils/height'

function realAbilities(): Ability[] {
    const text = readFileSync(join(__dirname, '../../__tests__/fixtures/abilities.txt'), 'utf8')
    const preview = buildImportPreview(text)
    if (preview.status !== 'ok') throw new Error('fixture failed to parse')
    return preview.datasets[0].payload as Ability[]
}

const terms = createTermBook(JSON.parse(readFileSync(join(__dirname, '../../__tests__/fixtures/terms.json'), 'utf8')) as GameTerm[])
const abilities = realAbilities()
const byKey = new Map(abilities.map(a => [a.key, a]))
const texts = (key: string) => describeAbility(byKey.get(key)!, { terms }).map(b => b.text)

describe('ability wording', () => {
    it('has wording for every tag in the real catalog', () => {
        expect(unmappedTags(abilities, terms)).toEqual([])
    })

    it('converts game heights', () => {
        expect(gameHeightToInches(1.45)).toBe(82)
        expect(gameHeightToInches(1.475)).toBe(83)
        expect(gameHeightToInches(1.025)).toBe(65)
    })

    it('words add effects with options as qualifiers', () => {
        const short = 'stronger on shorter builds and diminishes as builds get taller'
        expect(texts('Vertical Leap')).toEqual([
            `Increased jump speed by 1.8 (${short}, standing jumps, up to 6'10")`,
            `Increased jump speed by 1.2 (${short}, standing jumps, from 6'11", spike mode only)`,
            `Increased jump speed by 0.96 (${short}, standing jumps, from 6'11", block mode only)`,
        ])
    })

    it('skips the Group option', () => {
        expect(texts('Athletic')[0]).toBe('Increased jump speed by 0.5')
    })

    it('words negative adds, scales and sets', () => {
        expect(texts('Fast Approach')).toEqual(['Reduced spike windup by 0.025s', 'Faster block charge'])
        expect(texts('Butterman')).toEqual(['Increased dive distance by 25%'])
        expect(texts('Step Approach')).toEqual([
            'Toggle, off by default',
            'Reduced spike jump strength by 9%',
            'Spike windup fixed at 0.2s',
        ])
    })

    it('words sprint bonus generically', () => {
        expect(texts('Sprinter')).toEqual(['Increased sprint bonus by 1.5', 'Increased sprint speed cap by 3'])
    })

    it('words the block green window against the 0.9 fill', () => {
        expect(texts('Block Control')).toEqual(['Green block window starts 15% earlier than the normal 90% fill', 'Releasing a block early never misses'])
        expect(texts('Nerfed Block Control')).toEqual(['Green block window starts 5% earlier than the normal 90% fill'])
    })

    it('puts activation first and words team grants', () => {
        expect(texts('Speed Surge')[0]).toBe('Active ability, lasts 8s, 60s cooldown')
        expect(texts('Auto Lockdown')[0]).toBe('Activates itself when ready, lasts 60s, 300s cooldown')
        expect(texts('Special - Leader')).toEqual(["Teammates get Leader's Power", "Teammates get Leader's Jump"])
    })

    it('expands call grants into the granted ability', () => {
        const lookup = createAbilityLookup(abilities)
        const call = describeAbility(byKey.get('Captains Call')!, { terms, lookup }).find(b => b.tag === 'CallCaptainJump')!
        expect(call.text).toBe("Team gets Captain's Jump")
        expect(call.children?.map(b => b.text)).toEqual(['Increased jump speed by 0.2 (spike mode only)'])

        const wall = describeAbility(byKey.get('Captains Call - Wall')!, { terms, lookup }).find(b => b.tag === 'CallTeamNerfedBroad')!
        expect(wall.children?.map(b => b.text)).toEqual(['Increased block width by 0.5', 'Increased block height by 1', 'Increased block depth by 1'])
    })

    it('keeps the grant sentence without children when no lookup is given', () => {
        const call = describeAbility(byKey.get('Captains Call')!, { terms }).find(b => b.tag === 'CallEndurance')!
        expect(call).toMatchObject({ text: "Team gets Captain's Endurance", grants: "Captain's Endurance" })
        expect(call.children).toBeUndefined()
    })

    it('marks guessed wording', () => {
        const bullets = describeAbility(byKey.get('Block Shatter')!, { terms })
        expect(bullets).toEqual([{ category: 'block', text: 'Blocks can shatter', source: 'param', tag: 'BlockShatter', mapped: true, guess: true }])
        expect(describeAbility(byKey.get('Unstoppable')!, { terms })[0].guess).toBe(false)
    })

    it('falls back to humanized raw text for unknown tags', () => {
        const bullets = describeAbility({ key: 'X', effects: [{ op: 'add', tag: 'NewThing', amount: 2 }], params: { BrandNewFlag: 1 } }, { terms })
        expect(bullets.map(b => [b.text, b.mapped])).toEqual([
            ['Increased new thing by 2', false],
            ['Brand new flag', false],
        ])
    })

    it('renders everything raw with an empty term book', () => {
        const bullets = describeAbility(byKey.get('Sprinter')!, { terms: EMPTY_TERM_BOOK })
        expect(bullets.map(b => [b.text, b.mapped])).toEqual([['Increased sprint bonus by 1.5', false], ['Increased sprint cap by 3', false]])
        expect(unmappedTags([byKey.get('Sprinter')!], EMPTY_TERM_BOOK)).toEqual([
            { kind: 'effect', tag: 'SprintBonus', uses: 1 },
            { kind: 'effect', tag: 'SprintCap', uses: 1 },
        ])
    })
})

describe('term templates', () => {
    it('fills every placeholder', () => {
        expect(renderTemplate('{v} | {pct} | {pctChange}% | {inverse}x', 0.25)).toBe('0.25 | 25% | 75% | 4x')
    })

    it('leaves unknown placeholders and reports them', () => {
        expect(renderTemplate('Up to {max}', 2)).toBe('Up to {max}')
        expect(unknownPlaceholders('{v} then {max} and {pct}')).toEqual(['max'])
    })

    it('renders option placeholders', () => {
        expect(renderTemplate('{text} mode only', 'Spike')).toBe('spike mode only')
        expect(renderTemplate('up to {height}', 1.45)).toBe(`up to 6'10"`)
        expect(renderTemplate('{v}', true)).toBe('1')
    })
})

describe('option wording', () => {
    it('words options from rows', () => {
        expect(describeOption('Standing', false, terms)).toEqual({ text: null, mapped: true, guess: false })
        expect(describeOption('Standing', true, terms)).toEqual({ text: 'standing jumps', mapped: true, guess: false })
        expect(describeOption('Below', 1, terms)).toEqual({ text: 'and below', mapped: true, guess: true })
        expect(describeOption('Wobble', 2, terms)).toEqual({ text: 'wobble: 2', mapped: false, guess: false })
    })

    it('reports unknown options as unmapped', () => {
        const unhandled = unmappedTags(abilities, { ...terms, options: new Map() }).filter(t => t.kind === 'option')
        expect(unhandled.map(t => t.tag)).toEqual(expect.arrayContaining(['Mode', 'ShortBonus']))
        expect(unhandled.map(t => t.tag)).not.toContain('Group')
    })
})

describe('unmappedStyleTags', () => {
    it('lists serve style values without a param template', () => {
        expect(unmappedStyleTags([{ key: 'CurveballSide', value: 1 }], EMPTY_TERM_BOOK)).toEqual([{ kind: 'param', tag: 'CurveballSide', uses: 1 }])
    })

    it('skips values that already have a param template', () => {
        const book = createTermBook([{ kind: 'param', tag: 'CurveballSide', category: 'serve', label: null, unit: null, template: 'Curve +{v}', grants: null, verified: true }])
        expect(unmappedStyleTags([{ key: 'CurveballSide', value: 1 }], book)).toEqual([])
    })
})
