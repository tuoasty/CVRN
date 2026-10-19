import { describe, expect, it } from 'vitest'
import { buildHeightOdds } from '../buildHeightOdds'
import { fixtureDataset } from '../../../__tests__/fixtures/loadFixtures'

describe('buildHeightOdds', () => {
    it('turns weights into percents', () => {
        const odds = buildHeightOdds(fixtureDataset('heights.txt', 'heights'))
        expect(odds).toHaveLength(24)
        expect(odds[0]).toMatchObject({ value: 1.025, inches: 65, label: `5'5"`, weight: 2 })
        expect(odds[0].pct).toBeCloseTo(200 / 743)
        expect(odds.reduce((s, o) => s + o.pct, 0)).toBeCloseTo(100)
    })

    it('returns zero percents for zero total weight', () => {
        expect(buildHeightOdds([{ value: 1.1, weight: 0 }])[0].pct).toBe(0)
    })
})
