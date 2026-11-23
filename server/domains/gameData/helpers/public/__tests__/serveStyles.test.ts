import { describe, expect, it } from 'vitest'
import { fixtureDataset } from '../../../__tests__/fixtures/loadFixtures'
import { createTermBook, EMPTY_TERM_BOOK } from '../../../terms/template'
import { buildServeStyles, describeStyleValue } from '../serveStyles'

const styles = fixtureDataset('serve-styles.txt', 'serveStyles')
const values = fixtureDataset('serve-style-values.txt', 'serveStyleValues')
const curveTerm = createTermBook([
    { kind: 'param', tag: 'CurveballSide', category: 'serve', label: null, unit: null, template: 'Side spin serves curve +{v} more', grants: null, verified: true },
])

describe('describeStyleValue', () => {
    it('words a value through its param template', () => {
        expect(describeStyleValue('CurveballSide', 1, curveTerm)).toBe('Side spin serves curve +1 more')
    })

    it('falls back to raw text without a term', () => {
        expect(describeStyleValue('CurveballSide', 1, EMPTY_TERM_BOOK)).toBe('Curveball side: 1')
    })
})

describe('buildServeStyles', () => {
    const result = buildServeStyles(styles, values, curveTerm)

    it('gives every real style equal odds in game order', () => {
        expect(result.map(s => s.name)).toEqual(['Curveball', 'Dive Bomb', 'Hangtime', 'Knuckleball', 'Trapdoor', 'Long Haul', 'Razor'])
        expect(result.map(s => s.oddsPct.toFixed(2))).toEqual(Array(7).fill('14.29'))
    })

    it('pairs each style with its tunable and default value', () => {
        expect(result.find(s => s.name === 'Dive Bomb')).toMatchObject({ slug: 'dive-bomb', tunable: 'DiveBombTopDrop', value: 2.5, text: 'Dive bomb top drop: 2.5' })
        expect(result[0].text).toBe('Side spin serves curve +1 more')
    })

    it('leaves a style without exactly one value unworded', () => {
        expect(buildServeStyles([{ name: 'Lob' }], values, curveTerm)).toEqual([{ name: 'Lob', slug: 'lob', tunable: null, value: null, oddsPct: 100, text: '' }])
    })

    it('has no styles without a style list', () => {
        expect(buildServeStyles([], values, curveTerm)).toEqual([])
    })
})
