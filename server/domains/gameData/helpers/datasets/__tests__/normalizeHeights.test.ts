import { describe, expect, it } from 'vitest'
import { parseLuaData } from '../../lua/parseLuaData'
import { normalizeHeights } from '../normalizeHeights'
import { fixtureText } from '../../../__tests__/fixtures/loadFixtures'
import type { LuaValue } from '../../../types/luaValue'

function parseOne(text: string): LuaValue {
    const parsed = parseLuaData(text)
    if (!parsed.ok) throw new Error(parsed.error.message)
    return parsed.value[0].value
}

describe('normalizeHeights', () => {
    it('normalizes the real heights table', () => {
        const { payload, issues } = normalizeHeights(parseOne(fixtureText('heights.txt')))
        expect(issues).toEqual([])
        expect(payload).toHaveLength(24)
        expect(payload[0]).toEqual({ value: 1.025, weight: 2 })
        expect(payload[23]).toEqual({ value: 1.6, weight: 2 })
        expect(payload.reduce((s, h) => s + h.weight, 0)).toBe(743)
    })

    it('rejects a text value', () => {
        const { payload, issues } = normalizeHeights(parseOne('Rerolls.Heights = { { Value = "tall", Weight = 1 } }'))
        expect(payload).toEqual([])
        expect(issues.some(i => i.level === 'error')).toBe(true)
    })

    it('warns on a duplicate height', () => {
        const { payload, issues } = normalizeHeights(parseOne('Rerolls.Heights = { { Value = 1.1, Weight = 1 }, { Value = 1.1, Weight = 2 } }'))
        expect(payload).toHaveLength(2)
        expect(issues).toEqual([expect.objectContaining({ level: 'warning', entry: '1.1' })])
    })
})
