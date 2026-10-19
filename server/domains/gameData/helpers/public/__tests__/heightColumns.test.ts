import { describe, expect, it } from 'vitest'
import { fixtureDataset } from '../../../__tests__/fixtures/loadFixtures'
import { buildHeightColumns } from '../heightColumns'

const heights = fixtureDataset('heights.txt', 'heights')

describe('buildHeightColumns', () => {
    it('splits heights into 5, 6 and 7 foot columns', () => {
        const columns = buildHeightColumns(heights)
        expect(columns.map(c => [c.foot, c.rows.length])).toEqual([[5, 7], [6, 12], [7, 5]])
        expect(columns[0].rows[0].label).toBe(`5'5"`)
        expect(columns[2].rows.at(-1)!.label).toBe(`7'4"`)
    })

    it('sorts short to tall inside a column', () => {
        for (const column of buildHeightColumns(heights)) {
            const inches = column.rows.map(r => r.inches)
            expect(inches).toEqual([...inches].sort((a, b) => a - b))
        }
    })

    it('scales fill to the heaviest weight', () => {
        const rows = buildHeightColumns(heights).flatMap(c => c.rows)
        const max = Math.max(...rows.map(r => r.weight))
        expect(rows.filter(r => r.fill === 1)).toHaveLength(rows.filter(r => r.weight === max).length)
        for (const row of rows) expect(row.fill).toBeCloseTo(row.weight / max)
    })

    it('keeps the raw game value', () => {
        const row = buildHeightColumns([{ value: 1.375, weight: 1 }])[0].rows[0]
        expect(row).toMatchObject({ game: '1.375', label: `6'7"` })
    })

    it('returns no columns for no heights', () => {
        expect(buildHeightColumns([])).toEqual([])
    })
})
