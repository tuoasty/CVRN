import { describe, expect, it } from 'vitest'
import { parseLuaData } from '../../lua/parseLuaData'
import { normalizeBuildPassives } from '../normalizeBuildPassives'
import { fixtureText } from '../../../__tests__/fixtures/loadFixtures'
import type { LuaValue } from '../../../types/luaValue'

function parseOne(text: string): LuaValue {
    const parsed = parseLuaData(text)
    if (!parsed.ok) throw new Error(parsed.error.message)
    return parsed.value[0].value
}

const passives = (body: string) => normalizeBuildPassives(parseOne(`BuildPassives.ByName = { ${body} }`))

describe('normalizeBuildPassives', () => {
    it('normalizes the real build effects', () => {
        const { payload, issues } = normalizeBuildPassives(parseOne(fixtureText('build-passives.txt')))
        expect(issues).toEqual([])
        expect(payload).toHaveLength(51)
        expect(payload[0]).toEqual({ build: 'High Flyer', effects: [{ type: 'named', name: '+0.2 Jump Power' }] })
        expect(payload.find(p => p.build === 'Hitterish')!.effects).toEqual([
            { type: 'named', name: 'Nerfed Butterman' },
            { type: 'stat', field: 'MaxPower', value: 15.2 },
        ])
        expect(payload.find(p => p.build === 'Tiny King')!.effects).toEqual([{ type: 'bonus', slot: 'Ability1', name: 'Stance' }])
        expect(payload.find(p => p.build === 'Boulder')!.effects).toEqual([{ type: 'stat', field: 'FlexMaxPower', value: 15.7 }])
    })

    it('skips a false flag with a warning', () => {
        const { payload, issues } = passives('["A"] = { ["X"] = false }')
        expect(payload).toEqual([{ build: 'A', effects: [] }])
        expect(issues).toEqual([expect.objectContaining({ level: 'warning', entry: 'A' })])
    })

    it('warns on an unknown numeric field', () => {
        const { payload, issues } = passives('["A"] = { Speed = 2 }')
        expect(payload[0].effects).toEqual([{ type: 'stat', field: 'Speed', value: 2 }])
        expect(issues).toEqual([expect.objectContaining({ level: 'warning', entry: 'A', message: 'No wording for build field Speed' })])
    })

    it('skips an unsupported value shape', () => {
        const { payload, issues } = passives('["A"] = { Foo = { 1 } }')
        expect(payload[0].effects).toEqual([])
        expect(issues).toEqual([expect.objectContaining({ level: 'warning', entry: 'A' })])
    })

    it('errors when an entry is not a table', () => {
        const { payload, issues } = passives('["A"] = 3')
        expect(payload).toEqual([])
        expect(issues).toEqual([expect.objectContaining({ level: 'error', entry: 'A' })])
    })

    it('lets the last duplicate win', () => {
        const { payload, issues } = passives('["A"] = { ["X"] = true }, ["A"] = { ["Y"] = true }')
        expect(payload).toEqual([{ build: 'A', effects: [{ type: 'named', name: 'Y' }] }])
        expect(issues).toEqual([expect.objectContaining({ level: 'warning', entry: 'A' })])
    })
})
