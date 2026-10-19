import { describe, expect, it } from 'vitest'
import { buildSpecLinkPlan, normalizeSpecName, planSpecOps, type LinkSpec } from '../linkPlan'
import { nameDistance } from '../nameDistance'
import type { SpecLoadout } from '../../../types/datasets'

const specs: LinkSpec[] = [
    { id: 'a', name: 'Wilfredo León', stars: 5, position: 'OUT', height: 79, game_key: null },
    { id: 'b', name: 'TJ Defalco', stars: 4, position: 'OUT', height: 77, game_key: null },
    { id: 'c', name: 'Earvin Ngapeth', stars: 5, position: 'OUT', height: 76, game_key: 'Earvin Ngapeth' },
    { id: 'd', name: 'Old Spec', stars: 3, position: 'MID', height: 80, game_key: 'Gone Spec' },
]

const loadout = (key: string, height: number): SpecLoadout => ({
    key, name: key, height, cooldown: 1, endOnSpike: false, maxPower: 1, activeMaxPower: 1, passive: [], active: [], tuning: [],
})

describe('normalizeSpecName', () => {
    it('ignores case, accents, punctuation and spacing', () => {
        expect(normalizeSpecName('Wilfredo  León')).toBe('wilfredoleon')
        expect(normalizeSpecName('T.J DeFalco')).toBe(normalizeSpecName('TJ Defalco'))
    })

    it('measures edit distance on normalized names', () => {
        expect(nameDistance('T.J DeFalco', 'TJ Defalco')).toBe(0)
        expect(nameDistance('Leon', 'Leo')).toBe(1)
    })
})

describe('buildSpecLinkPlan', () => {
    it('plans linked, exact and ambiguous', () => {
        const plan = buildSpecLinkPlan([loadout('Wilfredo Leon', 1.375), loadout('T.J DeFalco', 1.35), loadout('Earvin Ngapeth', 1.3), loadout('New Guy', 1.2)], specs)
        expect(plan.items.map(i => [i.gameKey, i.status, i.specId])).toEqual([
            ['Wilfredo Leon', 'exact', 'a'], ['T.J DeFalco', 'exact', 'b'], ['Earvin Ngapeth', 'linked', 'c'], ['New Guy', 'ambiguous', undefined],
        ])
        expect(plan.items[0].height).toBe(79)
        expect(plan.orphaned).toEqual([{ specId: 'd', name: 'Old Spec', gameKey: 'Gone Spec' }])
    })

    it('ranks candidates for ambiguous specs and skips specs linked to the paste', () => {
        const plan = buildSpecLinkPlan([loadout('Earvin Ngapeth', 1.3), loadout('Old Spek', 1.2)], specs)
        const item = plan.items.find(i => i.gameKey === 'Old Spek')!
        expect(item.status).toBe('ambiguous')
        expect(item.candidates.map(c => c.specId)).toEqual(['d', 'b', 'a'])
    })

    it('a link beats a stale skip', () => {
        const plan = buildSpecLinkPlan([loadout('Earvin Ngapeth', 1.3)], specs, new Set(['Earvin Ngapeth']))
        expect(plan.items[0].status).toBe('linked')
    })

    it('never proposes one DB spec twice', () => {
        const plan = buildSpecLinkPlan([loadout('Wilfredo Leon', 1.375), loadout('Wilfredo León', 1.375)], specs)
        expect(plan.items.every(i => i.status === 'ambiguous')).toBe(true)
        expect(planSpecOps(plan, [
            { gameKey: 'Wilfredo Leon', action: 'link', specId: 'a', rename: false },
            { gameKey: 'Wilfredo León', action: 'link', specId: 'a', rename: false },
        ], specs)).toEqual({ ok: false, error: ['Wilfredo León: Wilfredo León is already chosen for "Wilfredo Leon"'] })
    })
})

describe('planSpecOps', () => {
    it('builds ops and height changes', () => {
        const plan = buildSpecLinkPlan([loadout('Wilfredo Leon', 1.375), loadout('T.J DeFalco', 1.35), loadout('Earvin Ngapeth', 1.3), loadout('New Guy', 1.2)], specs)
        const result = planSpecOps(plan, [
            { gameKey: 'Wilfredo Leon', action: 'link', specId: 'a', rename: true },
            { gameKey: 'T.J DeFalco', action: 'link', specId: 'b', rename: false },
            { gameKey: 'New Guy', action: 'create', stars: 4, position: 'SET' },
        ], specs)
        expect(result).toEqual({ ok: true, value: {
            ops: [
                { op: 'link', gameKey: 'Wilfredo Leon', specId: 'a', name: 'Wilfredo Leon', height: 79 },
                { op: 'link', gameKey: 'T.J DeFalco', specId: 'b', name: null, height: 78 },
                { op: 'create', gameKey: 'New Guy', name: 'New Guy', stars: 4, position: 'SET', height: 72 },
            ],
            heightChanges: [{ specId: 'b', name: 'TJ Defalco', from: 77, to: 78 }],
            undecided: [],
        } })
    })

    it('writes the height of an already linked spec when it differs', () => {
        const plan = buildSpecLinkPlan([loadout('Earvin Ngapeth', 1.35)], specs)
        expect(planSpecOps(plan, [], specs)).toEqual({ ok: true, value: {
            ops: [{ op: 'link', gameKey: 'Earvin Ngapeth', specId: 'c', name: null, height: 78 }],
            heightChanges: [{ specId: 'c', name: 'Earvin Ngapeth', from: 76, to: 78 }],
            undecided: [],
        } })
    })

    it('leaving unlinked writes nothing', () => {
        const plan = buildSpecLinkPlan([loadout('New Guy', 1.2)], specs)
        expect(planSpecOps(plan, [{ gameKey: 'New Guy', action: 'leave' }], specs)).toEqual({ ok: true, value: { ops: [], heightChanges: [], undecided: [] } })
    })

    it('remembers a skip', () => {
        const plan = buildSpecLinkPlan([loadout('New Guy', 1.2)], specs)
        expect(planSpecOps(plan, [{ gameKey: 'New Guy', action: 'skip' }], specs)).toEqual({ ok: true, value: { ops: [{ op: 'skip', gameKey: 'New Guy' }], heightChanges: [], undecided: [] } })
    })

    it('leaves skipped specs alone without a decision', () => {
        const plan = buildSpecLinkPlan([loadout('Roberlandy Simon', 1.45)], specs, new Set(['Roberlandy Simon']))
        expect(plan.items[0].status).toBe('skipped')
        expect(planSpecOps(plan, [], specs)).toEqual({ ok: true, value: { ops: [], heightChanges: [], undecided: [] } })
        expect(planSpecOps(plan, [{ gameKey: 'Roberlandy Simon', action: 'skip' }], specs)).toEqual({ ok: true, value: { ops: [], heightChanges: [], undecided: [] } })
    })

    it('restores a skipped spec', () => {
        const plan = buildSpecLinkPlan([loadout('New Guy', 1.2)], specs, new Set(['New Guy']))
        expect(planSpecOps(plan, [{ gameKey: 'New Guy', action: 'leave' }], specs)).toEqual({ ok: true, value: { ops: [{ op: 'unskip', gameKey: 'New Guy' }], heightChanges: [], undecided: [] } })
        const created = planSpecOps(plan, [{ gameKey: 'New Guy', action: 'create', stars: 3, position: 'LIB' }], specs)
        expect(created.ok && created.value.ops).toEqual([
            { op: 'unskip', gameKey: 'New Guy' },
            { op: 'create', gameKey: 'New Guy', name: 'New Guy', stars: 3, position: 'LIB', height: 72 },
        ])
    })

    it('reports undecided and taken names', () => {
        const linkedElsewhere = [specs[0], { ...specs[1], game_key: 'Someone Else' }]
        const plan = buildSpecLinkPlan([loadout('Wilfredo Leon', 1.375), loadout('TJ Defalco', 1.35)], linkedElsewhere)
        const missing = planSpecOps(plan, [], linkedElsewhere)
        expect(missing.ok && missing.value.undecided).toEqual(['Wilfredo Leon', 'TJ Defalco'])
        const taken = planSpecOps(plan, [{ gameKey: 'TJ Defalco', action: 'create', stars: 4, position: 'OUT' }], linkedElsewhere)
        expect(taken).toEqual({ ok: false, error: ['TJ Defalco: Name "TJ Defalco" is already used by another spec'] })
    })

    it('refuses unknown game keys and specs', () => {
        const plan = buildSpecLinkPlan([loadout('New Guy', 1.2)], specs)
        const result = planSpecOps(plan, [
            { gameKey: 'Nobody', action: 'leave' },
            { gameKey: 'New Guy', action: 'link', specId: 'zzz', rename: false },
        ], specs)
        expect(result).toEqual({ ok: false, error: ['Nobody: not in this import', 'New Guy: the chosen spec no longer exists'] })
    })

    it('refuses a spec still linked to another game key in the paste', () => {
        const plan = buildSpecLinkPlan([loadout('Earvin Ngapeth', 1.3), loadout('New Guy', 1.2)], specs)
        const result = planSpecOps(plan, [{ gameKey: 'New Guy', action: 'link', specId: 'c', rename: false }], specs)
        expect(result).toEqual({ ok: false, error: ['New Guy: Earvin Ngapeth is already linked to "Earvin Ngapeth"'] })
    })

    it('refuses a rename to a taken name', () => {
        const pool: LinkSpec[] = [
            { id: 'd', name: 'Old Spec', stars: 3, position: 'MID', height: 80, game_key: null },
            { id: 'e', name: 'Spare', stars: 3, position: 'LIB', height: 70, game_key: null },
        ]
        const plan = buildSpecLinkPlan([loadout('Old Spec', 1.2)], pool)
        expect(plan.items[0]).toMatchObject({ status: 'exact', specId: 'd' })
        const result = planSpecOps(plan, [{ gameKey: 'Old Spec', action: 'link', specId: 'e', rename: true }], pool)
        expect(result).toEqual({ ok: false, error: ['Old Spec: Name "Old Spec" is already used by another spec'] })
    })
})
