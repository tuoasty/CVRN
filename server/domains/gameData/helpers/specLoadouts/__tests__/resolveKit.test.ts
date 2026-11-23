import { describe, expect, it } from 'vitest'
import { createKitResolver, resolveTuning, tuneIssues } from '../resolveKit'
import { fixtureAbilities, fixtureSpecLoadouts } from '../../../__tests__/fixtures/loadFixtures'
import type { SpecLoadout } from '../../../types/datasets'

const abilities = fixtureAbilities()
const byKey = new Map(abilities.map(a => [a.key, a]))
const resolve = createKitResolver(byKey.keys())
const loadouts = fixtureSpecLoadouts()
const kitOf = (l: SpecLoadout) => [...l.passive.map(n => resolve(n, 'Passive')), ...l.active.map(n => resolve(n, 'Active'))]

describe('createKitResolver', () => {
    it('resolves kit tiers over the real data', () => {
        const all = loadouts.flatMap(kitOf)
        expect(all).toHaveLength(799)
        expect(all.filter(e => e.tier === 'ability')).toHaveLength(751)
        expect(all.filter(e => e.tier === 'variant')).toHaveLength(20)
        expect(all.filter(e => e.tier === 'text')).toHaveLength(28)
    })

    it('names each tier', () => {
        expect(resolve('+0.1 Backrow Blitz', 'Passive')).toEqual({ name: '+0.1 Backrow Blitz', slot: 'Passive', tier: 'variant', base: 'Backrow Blitz', modifier: '+0.1' })
        expect(resolve('+2.5 Set Reach', 'Active')).toEqual({ name: '+2.5 Set Reach', slot: 'Active', tier: 'text' })
        expect(resolve('+0.2,13 Feint', 'Active').tier).toBe('text')
        expect(resolve('mad dog', 'Active')).toEqual({ name: 'mad dog', slot: 'Active', tier: 'ability', key: 'Mad dog' })
    })
})

describe('resolveTuning', () => {
    const leon = loadouts.find(l => l.key === 'Wilfredo Leon')!

    it('reads tune before values', () => {
        expect(resolveTuning(leon, kitOf(leon), byKey)).toEqual([
            { slot: 'Passive', ability: 'Buffed Cannon', path: 'Effects.1.Amount', value: 15.8, target: 'Buffed Cannon', before: 15.6, label: 'Effect 1 amount' },
            { slot: 'Active', ability: 'Buffed Cannon', path: 'Effects.1.Amount', value: 16, target: 'Buffed Cannon', before: 15.6, label: 'Effect 1 amount' },
        ])
    })

    it('reads a later effect', () => {
        const tuned = loadouts.flatMap(l => resolveTuning(l, kitOf(l), byKey)).find(t => t.ability === 'Relentless' && t.path === 'Effects.2.Amount')!
        expect(tuned).toMatchObject({ before: 1, value: 0.5, label: 'Effect 2 amount' })
    })

    it('flags unsupported paths and slot mismatches', () => {
        const odd = { ...leon, tuning: [{ slot: 'Active' as const, ability: 'Wingspan', path: 'Params.X', value: 1 }] }
        const tunes = resolveTuning(odd, kitOf(odd), byKey)
        expect(tunes[0]).toMatchObject({ before: null, label: 'Params.X', target: 'Wingspan' })
        expect(tuneIssues(odd, tunes).map(i => i.message)).toEqual([
            'Tunes "Wingspan" but it is not in the Active kit',
            'Tune path Params.X is not supported, shown as written',
        ])
    })

    it('raises only the unsupported Params tune warnings on the real data', () => {
        const issues = loadouts.flatMap(l => tuneIssues(l, resolveTuning(l, kitOf(l), byKey)))
        expect(issues).toHaveLength(7)
        expect(issues.every(i => i.level === 'warning' && /^Tune path Params\.\w+ is not supported/.test(i.message))).toBe(true)
    })
})
