import { describe, expect, it } from 'vitest'
import { parseLuaData } from '../../lua/parseLuaData'
import { normalizeSpecLoadouts } from '../normalizeSpecLoadouts'
import { fixtureText } from '../../../__tests__/fixtures/loadFixtures'
import type { LuaValue } from '../../../types/luaValue'

function parseOne(text: string): LuaValue {
    const parsed = parseLuaData(text)
    if (!parsed.ok) throw new Error(parsed.error.message)
    return parsed.value[0].value
}

const SPEC = 'Name = "A", Height = 1, Cooldown = 1, EndOnSpike = true, MaxPower = 1, ActiveMaxPower = 1, Passive = {}, Active = {}'

describe('normalizeSpecLoadouts', () => {
    it('normalizes the real spec catalog', () => {
        const { payload, issues } = normalizeSpecLoadouts(parseOne(fixtureText('spec-loadouts.txt')))
        expect(issues).toEqual([])
        expect(payload).toHaveLength(58)
        const leon = payload.find(l => l.key === 'Wilfredo Leon')!
        expect(leon).toMatchObject({ name: 'Wilfredo Leon', height: 1.375, cooldown: 210, lifetime: 15, endOnSpike: false, maxPower: 15.8, activeMaxPower: 16 })
        expect(leon.passive).toHaveLength(6)
        expect(leon.active).toEqual(['Buffed Cannon', 'Special - Apex'])
        expect(leon.tuning).toEqual([
            { slot: 'Passive', ability: 'Buffed Cannon', path: 'Effects.1.Amount', value: 15.8 },
            { slot: 'Active', ability: 'Buffed Cannon', path: 'Effects.1.Amount', value: 16 },
        ])
        expect(leon.styles).toEqual([{ name: 'Curveball', value: 1 }, { name: 'Dive Bomb', value: 1 }])
        expect(payload.find(l => l.key === 'Earvin Ngapeth')!.tuning).toEqual([])
        expect(payload.find(l => l.key === 'Alessandro Michieletto')!.lifetime).toBeUndefined()
    })

    it('reads style() calls', () => {
        const { payload, issues } = normalizeSpecLoadouts(parseOne(`X = { A = { ${SPEC}, Styles = { style("Curveball", 1.6), style("Dive Bomb", 1) } } }`))
        expect(issues).toEqual([])
        expect(payload[0].styles).toEqual([{ name: 'Curveball', value: 1.6 }, { name: 'Dive Bomb', value: 1 }])
    })

    it('treats a missing Styles field and Styles = {} as no styles', () => {
        const missing = normalizeSpecLoadouts(parseOne(`X = { A = { ${SPEC} } }`))
        const empty = normalizeSpecLoadouts(parseOne(`X = { A = { ${SPEC}, Styles = {} } }`))
        expect(missing.payload[0].styles).toEqual([])
        expect(empty.payload[0].styles).toEqual([])
        expect(empty.issues).toEqual([])
    })

    it('errors on a Styles entry that is not style(name, number)', () => {
        const bad = normalizeSpecLoadouts(parseOne(`X = { A = { ${SPEC}, Styles = { style("Curveball") } } }`))
        const notCall = normalizeSpecLoadouts(parseOne(`X = { A = { ${SPEC}, Styles = { "Curveball" } } }`))
        expect(bad.issues.filter(i => i.level === 'error')).toHaveLength(1)
        expect(notCall.issues.filter(i => i.level === 'error')).toHaveLength(1)
    })

    it('rejects a tune that is not a tune call', () => {
        const { issues } = normalizeSpecLoadouts(parseOne(`SpecCatalog.Specs = { A = { ${SPEC}, Tuning = { "x" } } }`))
        expect(issues.some(i => i.level === 'error')).toBe(true)
    })

    it('rejects a tune with a bad slot', () => {
        const { issues } = normalizeSpecLoadouts(parseOne(`SpecCatalog.Specs = { A = { ${SPEC}, Tuning = { tune("Team", "X", "Effects.1.Amount", 1) } } }`))
        expect(issues.filter(i => i.level === 'error')).toHaveLength(1)
    })

    it('requires the core fields', () => {
        const { payload, issues } = normalizeSpecLoadouts(parseOne('SpecCatalog.Specs = { A = { Name = "A", Passive = {}, Active = {} } }'))
        expect(payload).toEqual([])
        expect(issues.some(i => i.level === 'error' && i.entry === 'A')).toBe(true)
    })

    it('keeps unknown fields as extra and warns on a name mismatch', () => {
        const { payload, issues } = normalizeSpecLoadouts(parseOne(`SpecCatalog.Specs = { B = { ${SPEC}, Wobble = 2 } }`))
        expect(payload[0].extra).toEqual({ Wobble: 2 })
        expect(issues.map(i => [i.level, i.message])).toEqual([
            ['warning', "Unknown field 'Wobble', kept as extra"],
            ['warning', 'Name "A" differs from its key'],
        ])
    })

    it('rejects unnamed entries', () => {
        const { issues } = normalizeSpecLoadouts(parseOne(`SpecCatalog.Specs = { { ${SPEC} } }`))
        expect(issues.some(i => i.level === 'error')).toBe(true)
    })
})
