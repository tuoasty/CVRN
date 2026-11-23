import { describe, expect, it } from 'vitest'
import { fixtureAbilities, fixtureDataset, fixtureTerms } from '../../../__tests__/fixtures/loadFixtures'
import { createAbilityLookup, describeAbility } from '../../../terms/describeAbility'
import type { Ability, GameDatasetPayloads } from '../../../types/datasets'
import type { DescriptionSource } from '../../../types/schemas'
import { buildAbilityCatalog, findAbility } from '../abilityCatalog'

const abilities = fixtureAbilities()
const base = {
    abilities,
    rarities: fixtureDataset('rarities.txt', 'rarities'),
    physicals: fixtureDataset('attributes.txt', 'physicals'),
    technicals: fixtureDataset('attributes.txt', 'technicals'),
}
const terms = fixtureTerms()

function catalog(payloads: Partial<GameDatasetPayloads> = base, settings: Record<string, DescriptionSource> = {}) {
    const list = payloads.abilities ?? []
    return buildAbilityCatalog(payloads, { context: { terms, lookup: createAbilityLookup(list) }, settings })
}

function all(groups: ReturnType<typeof catalog>['physical']) {
    return groups.flatMap(g => g.abilities)
}

describe('buildAbilityCatalog', () => {
    it('lists only rollables, 23 physicals and 40 technicals', () => {
        const c = catalog()
        expect(all(c.physical)).toHaveLength(23)
        expect(all(c.technical)).toHaveLength(40)
        expect(all(c.technical).some(a => a.key === 'Nerfed Butterman')).toBe(false)
    })

    it('orders groups rarest first with their tier odds', () => {
        const c = catalog()
        expect(c.technical.map(g => g.rarity)).toEqual(['Mythical', 'Epic', 'Rare', 'Common'])
        expect(c.technical[0]).toMatchObject({ normalPct: 3, luckyPct: 15 })
    })

    it('sorts A to Z inside a group', () => {
        for (const group of [...catalog().physical, ...catalog().technical]) {
            const names = group.abilities.map(a => a.key)
            expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
        }
    })

    it('slugs by key and marks actives and toggles', () => {
        const call = all(catalog().technical).find(a => a.key === 'Captains Call')!
        expect(call).toMatchObject({ slug: 'captains-call', kind: 'technical', rarity: 'Mythical', marker: { kind: 'active', cooldown: 150 } })
        const toggles = all([...catalog().physical, ...catalog().technical]).filter(a => a.marker?.kind === 'toggle')
        const expected = abilities.filter(a => a.toggle).map(a => a.key)
        expect(toggles.every(a => expected.includes(a.key))).toBe(true)
    })

    it('summarises ORIGINAL with the description', () => {
        const call = all(catalog().technical).find(a => a.key === 'Captains Call')!
        expect(call.source).toBe('original')
        expect(call.summary).toBe(abilities.find(a => a.key === 'Captains Call')!.description)
        expect(call.text).toBe(call.summary)
        expect(call.lines).toEqual([])
    })

    it('summarises DERIVED with the first non-activation line and keeps every line', () => {
        const call = all(catalog(base, { 'Captains Call': 'derived' }).technical).find(a => a.key === 'Captains Call')!
        const bullets = describeAbility(abilities.find(a => a.key === 'Captains Call')!, { terms, lookup: createAbilityLookup(abilities) })
        expect(call.source).toBe('derived')
        expect(call.text).toBeUndefined()
        expect(call.summary).toBe(bullets.find(b => b.source !== 'active' && b.source !== 'toggle')!.text)
        expect(call.lines.map(l => l.text)).toEqual(bullets.map(b => b.text))
    })

    it('returns an empty summary when there is nothing to say', () => {
        const bare: Ability = { key: 'Captains Call', active: { cooldown: 150 }, effects: [], params: {} }
        const c = catalog({ ...base, abilities: [bare] })
        expect(all(c.technical)[0].summary).toBe('')
    })

    it('links a grant only when its target resolves', () => {
        const call = all(catalog(base, { 'Captains Call': 'derived' }).technical).find(a => a.key === 'Captains Call')!
        expect(call.lines.filter(l => l.grants).map(l => l.grants)).toEqual(["Captain's Jump", "Captain's Endurance", "Captain's Rec"])

        const withoutJump = abilities.filter(a => a.key !== "Captain's Jump")
        const c = catalog({ ...base, abilities: withoutJump }, { 'Captains Call': 'derived' })
        const lines = all(c.technical).find(a => a.key === 'Captains Call')!.lines
        const jump = lines.find(l => l.text.includes("Captain's Jump"))!
        expect(jump.grants).toBeUndefined()
    })
})

describe('findAbility', () => {
    it('finds by kind and slug, null for stale or wrong-kind slugs', () => {
        const c = catalog()
        expect(findAbility(c, 'technical', 'captains-call')?.key).toBe('Captains Call')
        expect(findAbility(c, 'physical', 'captains-call')).toBeNull()
        expect(findAbility(c, 'technical', 'renamed-long-ago')).toBeNull()
    })
})
