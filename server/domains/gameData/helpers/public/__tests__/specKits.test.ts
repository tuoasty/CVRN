import { describe, expect, it } from 'vitest'
import { fixtureAbilities, fixtureDataset, fixtureSpecLoadouts, fixtureTerms } from '../../../__tests__/fixtures/loadFixtures'
import { createAbilityLookup } from '../../../terms/describeAbility'
import { capitalize } from '../../../terms/format'
import { buildAbilityIndex } from '../../abilityIndex/buildAbilityIndex'
import { buildInspector } from '../inspector'
import { buildSpecKits } from '../specKits'

const abilities = fixtureAbilities()
const terms = fixtureTerms()
const ctx = { context: { terms, lookup: createAbilityLookup(abilities) }, settings: {} }
const index = buildAbilityIndex({
    abilities,
    rarities: fixtureDataset('rarities.txt', 'rarities'),
    physicals: fixtureDataset('attributes.txt', 'physicals'),
    technicals: fixtureDataset('attributes.txt', 'technicals'),
})
const entryByKey = new Map(index.map(e => [e.key, e]))
const byKey = new Map(abilities.map(a => [a.key, a]))
const inspectorFor = (key: string) => {
    const ability = byKey.get(key)
    return ability ? buildInspector(ability, entryByKey.get(key), ctx) : undefined
}

const kits = buildSpecKits({ abilities, specLoadouts: fixtureSpecLoadouts() }, ctx, inspectorFor)

describe('buildSpecKits', () => {
    it('keys kits by loadout and carries cooldown and lifetime', () => {
        const leon = kits['Wilfredo Leon']
        expect(leon.cooldown).toBe(fixtureSpecLoadouts().find(l => l.key === 'Wilfredo Leon')!.cooldown)
        expect(leon.lifetime).toBe(15)
        expect(kits['Gold Ship'].lifetime).toBeUndefined()
    })

    it('splits Active and Passive in kit order', () => {
        const loadout = fixtureSpecLoadouts().find(l => l.key === 'Wilfredo Leon')!
        expect(kits['Wilfredo Leon'].active.map(e => e.name)).toEqual(loadout.active)
        expect(kits['Wilfredo Leon'].passive.map(e => e.name)).toEqual(loadout.passive)
    })

    it('resolves variants to their base and keeps the variant name', () => {
        const bounce = kits['Miguel Lopez'].passive.concat(kits['Miguel Lopez'].active).find(e => e.name === '+0.025 Bounce')!
        expect(bounce.target).toBe('Bounce')
    })

    it('keeps plain-text entries in their slot with no target', () => {
        const reach = kits['Antoine Brizard'].passive.find(e => e.name === '+1 Set Reach')!
        expect(reach.target).toBeUndefined()
        const teamPower = kits['Gold Ship'].active.find(e => e.name === '+1 Team Power')!
        expect(teamPower.target).toBeUndefined()
    })

    it('strikes the old value on a stat-sheet ability', () => {
        const athletic = kits['Alessandro Michieletto'].passive.find(e => e.name === 'Athletic')!
        expect(athletic.tuned?.sheet?.[0]).toMatchObject({ was: '+0.5', value: '+0' })
    })

    it('writes a tuned line with the term label when the ability has no sheet', () => {
        const cannon = kits['Wilfredo Leon'].passive.find(e => e.name === 'Buffed Cannon')!
        const tag = byKey.get('Buffed Cannon')!.effects[0].tag
        expect(cannon.tuned?.sheet).toBeUndefined()
        expect(cannon.tuned?.tuned).toEqual([`${capitalize(terms.effects.get(tag)!.label!)} 15.6 → 15.8`])
    })

    it('tunes an ability whose key looks like a variant against itself', () => {
        const leon = fixtureSpecLoadouts().find(l => l.key === 'Wilfredo Leon')!
        const odd = { ...leon, key: 'Odd', passive: ['+0.6 Wide Reach'], active: [], tuning: [{ slot: 'Passive' as const, ability: '+0.6 Wide Reach', path: 'Effects.1.Amount', value: 0 }] }
        const reach = buildSpecKits({ abilities, specLoadouts: [odd] }, ctx, inspectorFor).Odd.passive[0]
        expect(reach.target).toBe('+0.6 Wide Reach')
        expect(reach.tuned?.sheet?.[0]).toMatchObject({ value: '+0' })
    })

    it('shows a tune on a missing effect as written', () => {
        const bare = { ...fixtureSpecLoadouts().find(l => l.key === 'Wilfredo Leon')!, key: 'Bare', tuning: [{ slot: 'Passive' as const, ability: 'Wingspan', path: 'Effects.9.Amount', value: 2 }] }
        const result = buildSpecKits({ abilities, specLoadouts: [bare] }, ctx, inspectorFor)
        expect(result.Bare.passive.find(e => e.name === 'Wingspan')!.tuned?.tuned).toEqual(['Effect 9 amount 2'])
    })

    it('leaves untuned entries without a tuned inspector', () => {
        const leon = kits['Wilfredo Leon']
        expect(leon.passive.filter(e => e.tuned).map(e => e.name)).toEqual(['Buffed Cannon'])
    })

    it('has no kit for an unknown loadout key', () => {
        expect(kits['No Such Spec']).toBeUndefined()
    })
})
