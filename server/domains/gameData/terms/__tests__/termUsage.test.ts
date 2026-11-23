import { describe, expect, it } from 'vitest'
import { fixtureAbilities, fixtureTerms } from '../../__tests__/fixtures/loadFixtures'
import { collectTermUsage, SERVE_STYLE_SOURCE, termId, unhandledTerms } from '../termUsage'

const abilities = fixtureAbilities()
const terms = fixtureTerms()
const usage = collectTermUsage(abilities)

describe('term usage', () => {
    it('counts JumpSpeed lines and abilities', () => {
        const jump = usage.get(termId('effect', 'JumpSpeed'))!
        expect(jump.uses).toBe(16)
        expect(jump.abilities).toHaveLength(14)
        expect(jump.abilities).toContain('Bounce')
        expect(jump.examples.length).toBeLessThanOrEqual(5)
    })

    it('tracks params and options but skips Group', () => {
        expect(usage.get(termId('param', 'Domination'))?.abilities.length).toBeGreaterThan(0)
        expect(usage.get(termId('option', 'Mode'))?.examples).toEqual(expect.arrayContaining(['Spike', 'Block']))
        expect(usage.has(termId('option', 'Group'))).toBe(false)
    })

    it('lists nothing unhandled for the real catalog', () => {
        expect(unhandledTerms(usage, terms)).toEqual([])
    })

    it('lists tags with no row, most used first', () => {
        const book = { ...terms, effects: new Map(terms.effects), options: new Map() }
        book.effects.delete('JumpSpeed')
        const unhandled = unhandledTerms(usage, book)
        expect(unhandled.map(u => termId(u.kind, u.tag))).toContain('effect:JumpSpeed')
        for (let i = 1; i < unhandled.length; i++) expect(unhandled[i - 1].uses).toBeGreaterThanOrEqual(unhandled[i].uses)
    })

    it('counts serve style values as params from Serve styles', () => {
        const styled = collectTermUsage([], [{ key: 'CurveballSide', value: 1 }, { key: 'DiveBombTopDrop', value: 2.5 }])
        expect(SERVE_STYLE_SOURCE).toBe('Serve styles')
        expect(styled.get(termId('param', 'CurveballSide'))).toMatchObject({ kind: 'param', uses: 1, abilities: ['Serve styles'], examples: [1] })
        expect(styled.get(termId('param', 'DiveBombTopDrop'))?.examples).toEqual([2.5])
    })
})
