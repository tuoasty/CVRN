import { describe, expect, it } from 'vitest'
import { fixtureAbilities, fixtureDataset, fixtureTerms } from '../../../__tests__/fixtures/loadFixtures'
import { createAbilityLookup } from '../../../terms/describeAbility'
import { buildAbilityCatalog } from '../abilityCatalog'
import { buildBuildCatalog } from '../buildCatalog'
import { buildHeightColumns } from '../heightColumns'
import { buildInspector, type InspectorContext } from '../inspector'
import { buildAbilityIndex } from '../../abilityIndex/buildAbilityIndex'

const abilities = fixtureAbilities()
const payloads = {
    abilities,
    rarities: fixtureDataset('rarities.txt', 'rarities'),
    physicals: fixtureDataset('attributes.txt', 'physicals'),
    technicals: fixtureDataset('attributes.txt', 'technicals'),
    heights: fixtureDataset('heights.txt', 'heights'),
    builds: fixtureDataset('builds.txt', 'builds'),
    buildPassives: fixtureDataset('build-passives.txt', 'buildPassives'),
}
const ctx: InspectorContext = { context: { terms: fixtureTerms(), lookup: createAbilityLookup(abilities) }, settings: {} }
const abilityCatalog = buildAbilityCatalog(payloads, ctx)
const index = new Map(buildAbilityIndex({ abilities, physicals: payloads.physicals, technicals: payloads.technicals, rarities: payloads.rarities }).map(e => [e.key, e]))
const byKey = new Map(abilities.map(a => [a.key, a]))
const inspectorFor = (key: string) => {
    const ability = byKey.get(key)
    return ability ? buildInspector(ability, index.get(key), ctx) : undefined
}
const catalog = buildBuildCatalog(payloads, abilityCatalog, buildHeightColumns(payloads.heights), inspectorFor)
const builds = catalog.groups.flatMap(g => g.builds)
const find = (name: string) => builds.find(b => b.name === name)!

describe('buildBuildCatalog', () => {
    it('drops builds without effects', () => {
        expect(builds.map(b => b.name)).not.toContain('Anchor')
        expect(builds.map(b => b.name)).not.toContain('Bulldozer')
        expect(builds).toHaveLength(52)
    })

    it('orders groups rarest first and builds A to Z', () => {
        expect(catalog.groups.map(g => g.rarity)).toEqual(['Mythical', 'Epic', 'Rare', 'Common'])
        for (const group of catalog.groups) {
            const names = group.builds.map(b => b.name)
            expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
        }
    })

    it('keeps both Bandit combos with slugs and height labels', () => {
        expect(find('Bandit')).toMatchObject({
            slug: 'bandit',
            rarity: 'Rare',
            combos: [
                { physical: 'Solid Form', physicalSlug: 'solid-form', technical: 'Breathing Control', technicalSlug: 'breathing-control', heightLabel: `5'5" to 6'2"` },
                { physical: 'Solid Form', technical: 'Swift Recovery', technicalSlug: 'swift-recovery' },
            ],
        })
        expect(find('Bandit').combos[0]).toMatchObject({ minInches: 65, maxInches: 74 })
    })

    it('renders stat effects as plain text', () => {
        expect(find('Tyrant').effects).toEqual([{ kind: 'text', text: 'Max power 15.6' }])
    })

    it('turns exclusive ability effects into ability effects with no part line', () => {
        expect(find('Bandit').effects).toEqual([{ kind: 'ability', name: 'Nerfed Butterman', target: 'Nerfed Butterman' }])
        expect(find('Bandit').parts.map(p => p.role)).toEqual(['Physical', 'Technical', 'Technical'])
    })

    it('lists the physical, technical and bonus parts with wording and links', () => {
        const tiny = find('Tiny King')
        expect(tiny.effects).toEqual([{ kind: 'bonus', name: 'Stance', target: 'Stance' }])
        expect(tiny.parts.map(p => [p.name, p.role])).toEqual([['Athletic', 'Physical'], ['Captains Call', 'Technical'], ['Stance', 'Bonus']])
        expect(tiny.parts[0].href).toBe('/information/abilities?type=physical&ability=athletic')
        for (const part of tiny.parts) expect(part.wording.length).toBeGreaterThan(0)
    })

    it('lists every rollable as a pick option and never None', () => {
        expect(catalog.physicals).toHaveLength(22)
        expect(catalog.technicals).toHaveLength(43)
        expect([...catalog.physicals, ...catalog.technicals].map(o => o.name)).not.toContain('None')
        expect(catalog.physicals[0]).toMatchObject({ slug: expect.any(String), rarity: 'Mythical' })
    })

    it('lists the 24 rolled heights', () => {
        expect(catalog.heights).toHaveLength(24)
        expect(catalog.heights[0].inches).toBeLessThan(catalog.heights[23].inches)
    })

    it('returns an empty catalog for empty input', () => {
        expect(buildBuildCatalog({}, { physical: [], technical: [] }, [], () => undefined)).toEqual({ groups: [], physicals: [], technicals: [], heights: [] })
    })
})
