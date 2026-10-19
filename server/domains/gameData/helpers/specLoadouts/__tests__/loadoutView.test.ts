import { describe, expect, it } from 'vitest'
import { fixtureAbilities, fixtureSpecLoadouts } from '../../../__tests__/fixtures/loadFixtures'
import { createKitResolver, resolveKit, type ResolvedTune } from '../resolveKit'
import { groupLoadouts, indexLabel, kitSections, requirementStatus, specPopLine, tuneNotes } from '../loadoutView'

const loadouts = fixtureSpecLoadouts()
const linked = new Map([
    ['Wilfredo Leon', { name: 'Wilfredo León', stars: 5, position: 'OUT' }],
    ['Earvin Ngapeth', { name: 'Earvin Ngapeth', stars: 5, position: 'OUT' }],
    ['T.J DeFalco', { name: 'TJ Defalco', stars: 4, position: 'OUT' }],
    ['Maksim Mikhaylov', { name: 'Maksim Mikhaylov', stars: 4, position: 'OPP', is_vaulted: true }],
])

describe('groupLoadouts', () => {
    it('groups by position, then not linked, then skipped', () => {
        const groups = groupLoadouts(loadouts, linked, new Set(['Roberlandy Simon', 'Austin']), '')
        expect(groups.map(g => g.label)).toEqual(['Outside', 'Opposite', 'Not linked', 'Skipped'])
        expect(groups[0].rows.map(r => [r.label, r.stars])).toEqual([['Earvin Ngapeth', 5], ['Wilfredo León', 5], ['TJ Defalco', 4]])
        expect(groups[2].rows).toHaveLength(51)
        expect(groups[2].rows.every(r => r.state === 'unlinked' && r.stars === null)).toBe(true)
        expect(groups[3].rows.map(r => r.label)).toEqual(['Austin', 'Roberlandy Simon'])
        expect(groups[1].rows.map(r => [r.label, r.vaulted])).toEqual([['Maksim Mikhaylov', true]])
        expect(groups[0].rows.every(r => !r.vaulted)).toBe(true)
        expect(groupLoadouts(loadouts, linked, new Set(), 'defalco')[0].rows.map(r => r.gameKey)).toEqual(['T.J DeFalco'])
    })

    it('puts vaulted specs below active ones in a position', () => {
        const withVaulted = new Map([...linked, ['Wilfredo Leon', { name: 'Wilfredo León', stars: 5, position: 'OUT', is_vaulted: true }]])
        const groups = groupLoadouts(loadouts, withVaulted, new Set(), '')
        expect(groups[0].rows.map(r => r.label)).toEqual(['Earvin Ngapeth', 'TJ Defalco', 'Wilfredo León'])
    })

    it('keeps a linked spec out of skipped', () => {
        const groups = groupLoadouts(loadouts, linked, new Set(['Wilfredo Leon']), '')
        expect(groups.find(g => g.label === 'Skipped')).toBeUndefined()
        expect(groups[0].rows.map(r => r.gameKey)).toContain('Wilfredo Leon')
    })
})

describe('specPopLine', () => {
    it('writes the spec pop line', () => {
        const by = (k: string) => loadouts.find(l => l.key === k)!
        expect(specPopLine(by('Wilfredo Leon'))).toBe('220s cooldown · lasts 10s · max power 15.7 → 16')
        expect(specPopLine(by('Gold Ship'))).toBe('50s cooldown · ends on spike · max power 15.75 → 20')
        expect(specPopLine(by('Alessandro Michieletto'))).toBe('260s cooldown · ends on spike · max power 15.5')
    })
})

describe('kitSections', () => {
    it('splits plain text out of the kit', () => {
        const resolve = createKitResolver(fixtureAbilities().map(a => a.key))
        const sections = kitSections(resolveKit(loadouts.find(l => l.key === 'Gold Ship')!, resolve))
        expect([sections.passive.length, sections.active.length, sections.text.length]).toEqual([44, 16, 6])
        expect(sections.text.every(e => e.tier === 'text')).toBe(true)
    })
})

describe('tuneNotes', () => {
    it('writes tune notes', () => {
        const tunes: ResolvedTune[] = [
            { slot: 'Passive', ability: 'Wingspan', path: 'Effects.1.Amount', value: 0.85, target: 'Wingspan', before: 0.8, label: 'Effect 1 amount' },
            { slot: 'Passive', ability: 'Wingspan', path: 'Params.X', value: 1, target: 'Wingspan', before: null, label: 'Params.X' },
        ]
        const notes = tuneNotes(tunes, 'Passive', 'Wingspan')
        expect([...notes.byEffect]).toEqual([[1, 'This spec: 0.8 → 0.85']])
        expect(notes.other).toEqual(['This spec: Params.X = 1'])
        expect(tuneNotes(tunes, 'Active', 'Wingspan').byEffect.size).toBe(0)
    })
})

describe('labels', () => {
    it('labels index entries and region status', () => {
        expect(indexLabel({ key: 'x', availability: 'physical', rarity: 'Mythical', isActive: false, isToggle: false, grants: [] })).toBe('Physical · Mythical')
        expect(indexLabel({ key: 'x', availability: 'technical', isActive: false, isToggle: false, grants: [] })).toBe('Technical')
        expect(indexLabel({ key: 'x', availability: 'exclusive', isActive: false, isToggle: false, grants: [] })).toBe('Exclusive')
        expect(indexLabel(undefined)).toBe('')
        expect(requirementStatus(['r1', 'r3'], [{ id: 'r1', code: 'AS' }, { id: 'r2', code: 'EU' }, { id: 'r3', code: 'NA' }, { id: 'r4', code: 'SA' }], ['AS', 'EU', 'NA', 'SA']))
            .toEqual([{ code: 'AS', set: true }, { code: 'EU', set: false }, { code: 'NA', set: true }, { code: 'SA', set: false }])
    })
})
