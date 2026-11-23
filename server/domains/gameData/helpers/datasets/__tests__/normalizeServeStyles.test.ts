import { describe, expect, it } from 'vitest'
import { parseLuaData } from '../../lua/parseLuaData'
import { normalizeServeStyles } from '../normalizeServeStyles'
import { fixtureText } from '../../../__tests__/fixtures/loadFixtures'
import type { LuaValue } from '../../../types/luaValue'

function parseOne(text: string): LuaValue {
    const parsed = parseLuaData(text)
    if (!parsed.ok) throw new Error(parsed.error.message)
    return parsed.value[0].value
}

describe('normalizeServeStyles', () => {
    it('reads the real style list in order', () => {
        const { payload, issues } = normalizeServeStyles(parseOne(fixtureText('serve-styles.txt')))
        expect(payload.map(s => s.name)).toEqual(['Curveball', 'Dive Bomb', 'Hangtime', 'Knuckleball', 'Trapdoor', 'Long Haul', 'Razor'])
        expect(issues).toEqual([])
    })

    it('errors on a non-string entry', () => {
        const { payload, issues } = normalizeServeStyles(parseOne('X = { "A", 2 }'))
        expect(payload).toEqual([{ name: 'A' }])
        expect(issues).toEqual([expect.objectContaining({ level: 'error', entry: 'Entry 2' })])
    })

    it('warns on a duplicate and keeps one', () => {
        const { payload, issues } = normalizeServeStyles(parseOne('X = { "A", "A" }'))
        expect(payload).toEqual([{ name: 'A' }])
        expect(issues).toEqual([expect.objectContaining({ level: 'warning', entry: 'A' })])
    })

    it('errors when the value is not a list', () => {
        const { payload, issues } = normalizeServeStyles(parseOne('X = { A = "B" }'))
        expect(payload).toEqual([])
        expect(issues[0].level).toBe('error')
    })
})
