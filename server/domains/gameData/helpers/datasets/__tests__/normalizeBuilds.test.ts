import { describe, expect, it } from 'vitest'
import { parseLuaData } from '../../lua/parseLuaData'
import { normalizeBuilds } from '../normalizeBuilds'
import { fixtureText } from '../../../__tests__/fixtures/loadFixtures'
import type { LuaValue } from '../../../types/luaValue'

function parseOne(text: string): LuaValue {
    const parsed = parseLuaData(text)
    if (!parsed.ok) throw new Error(parsed.error.message)
    return parsed.value[0].value
}

const row = (fields: string) => `{ Name = "A", Rarity = "Rare", Physical = "Bounce", Technical = "Feint", MinHeight = 1.1, MaxHeight = 1.2${fields} }`
const table = (...rows: string[]) => `Builds.Table = { ${rows.join(', ')} }`

describe('normalizeBuilds', () => {
    it('groups the real builds table by name', () => {
        const { payload, issues } = normalizeBuilds(parseOne(fixtureText('builds.txt')))
        expect(issues).toEqual([])
        expect(payload).toHaveLength(52)
        expect(payload[0]).toEqual({ name: 'High Flyer', rarity: 'Mythical', combos: [{ physical: 'Bounce', technical: 'Swiper', minHeight: 1.375, maxHeight: 1.375 }] })
        expect(payload.find(b => b.name === 'Bandit')!.combos).toHaveLength(2)
    })

    it('keeps the first rarity and warns when a name repeats with another', () => {
        const { payload, issues } = normalizeBuilds(parseOne(table(row(''), row('').replace('"Rare"', '"Epic"').replace('"Feint"', '"Swiper"'))))
        expect(payload).toHaveLength(1)
        expect(payload[0].rarity).toBe('Rare')
        expect(payload[0].combos).toHaveLength(2)
        expect(issues).toEqual([expect.objectContaining({ level: 'warning', entry: 'A' })])
    })

    it('warns on an identical repeated combo', () => {
        const { payload, issues } = normalizeBuilds(parseOne(table(row(''), row(''))))
        expect(payload[0].combos).toHaveLength(1)
        expect(issues).toEqual([expect.objectContaining({ level: 'warning', entry: 'A' })])
    })

    it('warns when MinHeight is above MaxHeight', () => {
        const { payload, issues } = normalizeBuilds(parseOne(table(row('').replace('MinHeight = 1.1', 'MinHeight = 1.5'))))
        expect(payload).toHaveLength(1)
        expect(issues).toEqual([expect.objectContaining({ level: 'warning', entry: 'A' })])
    })

    it('errors on a missing field', () => {
        const { payload, issues } = normalizeBuilds(parseOne(table(row('').replace(', Technical = "Feint"', ''))))
        expect(payload).toEqual([])
        expect(issues).toEqual([expect.objectContaining({ level: 'error', entry: 'A' })])
    })

    it('warns on an unknown field and drops it', () => {
        const { payload, issues } = normalizeBuilds(parseOne(table(row(', Foo = 1'))))
        expect(payload[0]).not.toHaveProperty('Foo')
        expect(payload[0].combos[0]).not.toHaveProperty('Foo')
        expect(issues).toEqual([expect.objectContaining({ level: 'warning', message: expect.stringContaining('Foo') })])
    })
})
