import { describe, expect, it } from 'vitest'
import { fixtureAbilities, fixtureTerms } from '../../../__tests__/fixtures/loadFixtures'
import { createAbilityLookup, describeAbility } from '../../../terms/describeAbility'
import type { Ability } from '../../../types/datasets'
import type { AbilityIndexEntry } from '../../../types/abilityIndex'
import type { ResolvedTune } from '../../specLoadouts/resolveKit'
import { abilityHref, applyTunes, buildInspector } from '../inspector'

const abilities = fixtureAbilities()
const byKey = new Map(abilities.map(a => [a.key, a]))
const context = { terms: fixtureTerms(), lookup: createAbilityLookup(abilities) }

function ability(key: string): Ability {
    const found = byKey.get(key)
    if (!found) throw new Error(`missing fixture ability ${key}`)
    return found
}

function entry(key: string, availability: AbilityIndexEntry['availability'], rarity?: string): AbilityIndexEntry {
    return { key, availability, rarity, isActive: false, isToggle: false, grants: [] }
}

function inspect(a: Ability, e?: AbilityIndexEntry, settings: Record<string, 'original' | 'derived'> = {}) {
    return buildInspector(a, e, { context, settings })
}

function tune(path: string, value: number, before: number | null, label: string): ResolvedTune {
    return { slot: 'Passive', ability: 'X', path, value, before, label }
}

describe('buildInspector stat sheet', () => {
    it('builds a sheet for an effects-only ability whose terms all have labels', () => {
        const data = inspect(ability('Buffed All-Rounder'))
        expect(data.sheet?.map(r => [r.label, r.value])).toEqual([
            ['Max stamina', '+2'],
            ['Attack hitbox height', '×1.2'],
            ['Receive hitbox height', '×1.2'],
        ])
        expect(data.text).toBeUndefined()
        expect(data.lines).toBeUndefined()
    })

    it('formats negative adds, sets and units', () => {
        expect(inspect(ability('Fast Approach')).sheet?.[0].value).toBe('-0.025s')
        expect(inspect(ability('Clutch Power')).sheet?.[0].value).toBe('15.4')
        const set: Ability = { key: 'Unit Set', effects: [{ op: 'set', tag: 'BlockSideRoll', amount: 15.6 }], params: {} }
        expect(inspect(set).sheet?.[0].value).toBe('15.6°')
    })

    it('ignores the Group option when deciding on a sheet', () => {
        expect(inspect(ability('Athletic')).sheet).toHaveLength(4)
    })

    it('skips the sheet when an effect term has no label', () => {
        const a: Ability = { key: 'Odd', description: 'Odd text', effects: [{ op: 'add', tag: 'NoSuchTag', amount: 1 }], params: {} }
        expect(inspect(a).sheet).toBeUndefined()
        expect(inspect(a).text).toBe('Odd text')
    })

    it('skips the sheet when an effect carries options', () => {
        const data = inspect(ability('Bounce'))
        expect(data.sheet).toBeUndefined()
        expect(data.text).toBe(ability('Bounce').description)
    })

    it('skips the sheet when the ability has params, an active or a toggle', () => {
        expect(inspect(ability('Wingspan')).sheet).toBeUndefined()
        const base = ability('Sprinter')
        expect(inspect({ ...base, active: { cooldown: 60 } }).sheet).toBeUndefined()
        expect(inspect({ ...base, toggle: { name: 'T', defaultOn: true } }).sheet).toBeUndefined()
    })
})

describe('buildInspector wording', () => {
    it('uses the game description for ORIGINAL', () => {
        expect(inspect(ability('Wingspan')).text).toBe(ability('Wingspan').description)
    })

    it('uses the top-level derived lines for DERIVED', () => {
        const data = inspect(ability('Wingspan'), undefined, { Wingspan: 'derived' })
        expect(data.text).toBeUndefined()
        expect(data.lines).toEqual(describeAbility(ability('Wingspan'), context).map(b => b.text))
    })

    it('falls back to derived lines when there is no description', () => {
        const a: Ability = { ...ability('Wingspan'), key: 'Bare', description: undefined }
        expect(inspect(a).lines?.length).toBeGreaterThan(0)
    })
})

describe('buildInspector identity', () => {
    it('links rollables to Abilities', () => {
        const data = inspect(ability('Wingspan'), entry('Wingspan', 'physical', 'Epic'))
        expect(data).toMatchObject({ key: 'Wingspan', name: 'Wingspan', kind: 'physical', rarity: 'Epic', href: '/information/abilities?type=physical&ability=wingspan' })
    })

    it('gives exclusives no link and no rarity', () => {
        const data = inspect(ability('Nerfed Butterman'), entry('Nerfed Butterman', 'exclusive'))
        expect(data.kind).toBe('exclusive')
        expect(data.href).toBeUndefined()
        expect(data.rarity).toBeUndefined()
    })

    it('treats an ability missing from the index as exclusive', () => {
        expect(inspect(ability('Nerfed Butterman')).kind).toBe('exclusive')
    })
})

describe('abilityHref', () => {
    it('builds the Abilities deep link', () => {
        expect(abilityHref('technical', 'captains-call')).toBe('/information/abilities?type=technical&ability=captains-call')
    })
})

describe('applyTunes', () => {
    it('strikes the old value on the tuned sheet row', () => {
        const data = applyTunes(inspect(ability('Buffed All-Rounder')), [tune('Effects.1.Amount', 3, 2, 'Effect 1 amount')])
        expect(data.sheet?.[0]).toMatchObject({ value: '+3', was: '+2' })
        expect(data.sheet?.[1].was).toBeUndefined()
        expect(data.tuned).toBeUndefined()
    })

    it('lists every other tune as a line', () => {
        const data = applyTunes(inspect(ability('Wingspan')), [
            tune('Cooldown', 90, 120, 'Cooldown'),
            tune('Effects.1.Amount', 0.85, 0.8, 'Effect 1 amount'),
        ])
        expect(data.tuned).toEqual(['Cooldown 120 → 90', 'Effect 1 amount 0.8 → 0.85'])
    })

    it('shows only the new value when the old one is unknown', () => {
        const data = applyTunes(inspect(ability('Wingspan')), [tune('Lifetime', 8, null, 'Lifetime')])
        expect(data.tuned).toEqual(['Lifetime 8'])
    })

    it('leaves the input untouched', () => {
        const base = inspect(ability('Buffed All-Rounder'))
        applyTunes(base, [tune('Effects.1.Amount', 3, 2, 'Effect 1 amount')])
        expect(base.sheet?.[0].was).toBeUndefined()
    })
})
