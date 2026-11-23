import { describe, expect, it } from 'vitest'
import { parseLuaData } from '../../lua/parseLuaData'
import { normalizeServeStyleValues } from '../normalizeServeStyleValues'
import { fixtureText } from '../../../__tests__/fixtures/loadFixtures'
import type { LuaCall, LuaValue } from '../../../types/luaValue'

function parseOne(text: string): LuaValue {
    const parsed = parseLuaData(text)
    if (!parsed.ok) throw new Error(parsed.error.message)
    return parsed.value[0].value
}

describe('normalizeServeStyleValues', () => {
    it('reads the real Style tunables', () => {
        const call = parseOne(fixtureText('serve-style-values.txt')) as LuaCall
        const { payload, issues } = normalizeServeStyleValues(call.args[1])
        expect(payload).toEqual([
            { key: 'CurveballSide', value: 1 },
            { key: 'DiveBombTopDrop', value: 2.5 },
            { key: 'HangtimeTopDrop', value: 2.5 },
            { key: 'KnuckleballFloat', value: 1 },
            { key: 'TrapdoorFloat', value: 1 },
            { key: 'LongHaulFloat', value: 1 },
            { key: 'RazorFloat', value: 1 },
        ])
        expect(issues).toEqual([])
    })

    it('errors on a value that is not a number', () => {
        const { payload, issues } = normalizeServeStyleValues(parseOne('X = { A = 1, B = "x" }'))
        expect(payload).toEqual([{ key: 'A', value: 1 }])
        expect(issues).toEqual([expect.objectContaining({ level: 'error', entry: 'B' })])
    })

    it('errors when the value is not a keyed table', () => {
        const { payload, issues } = normalizeServeStyleValues(parseOne('X = { 1, 2 }'))
        expect(payload).toEqual([])
        expect(issues[0].level).toBe('error')
    })
})
