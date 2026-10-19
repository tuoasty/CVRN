import { describe, expect, it } from 'vitest'
import { buildBuildIndex } from '../buildBuildIndex'
import { createNameResolver } from '../../specLoadouts/resolveKit'
import { fixtureAbilities, fixtureDataset } from '../../../__tests__/fixtures/loadFixtures'

const abilities = fixtureAbilities()
const builds = fixtureDataset('builds.txt', 'builds')
const passives = fixtureDataset('build-passives.txt', 'buildPassives')
const index = buildBuildIndex({ builds, passives, abilities })
const find = (name: string) => index.find(b => b.name === name)!

describe('createNameResolver', () => {
    const resolve = createNameResolver(abilities.map(a => a.key))

    it('names each tier without a kit slot', () => {
        expect(resolve('Third Stance')).toEqual({ tier: 'ability', key: 'Third Stance' })
        expect(resolve('+0.1 Backrow Blitz')).toEqual({ tier: 'variant', base: 'Backrow Blitz', modifier: '+0.1' })
        expect(resolve('+0.2 Jump Power')).toEqual({ tier: 'text' })
    })
})

describe('buildBuildIndex', () => {
    it('resolves the real build effects', () => {
        expect(index).toHaveLength(54)
        expect(find('High Flyer').effects).toEqual([{ type: 'text', name: '+0.2 Jump Power' }])
        expect(find('Bandit').effects).toEqual([{ type: 'ability', name: 'Nerfed Butterman', key: 'Nerfed Butterman' }])
        expect(find('Tiny King').effects).toEqual([{ type: 'bonus', name: 'Stance', key: 'Stance' }])
        expect(find('Tyrant').effects).toEqual([{ type: 'text', name: 'Max power 15.6' }])
        expect(find('Boulder').effects).toEqual([{ type: 'text', name: 'Flex max power 15.7' }])
    })

    it('stat-only builds have effects', () => {
        expect(find('Tyrant').hasEffects).toBe(true)
    })

    it('marks builds without effects', () => {
        expect(index.filter(b => !b.hasEffects).map(b => b.name)).toEqual(['Anchor', 'Bulldozer'])
    })

    it('joins effects to builds ignoring case', () => {
        const joined = buildBuildIndex({ builds, passives: [{ build: ' one HAND ', effects: [{ type: 'named', name: 'Third Stance' }] }], abilities })
        expect(joined.find(b => b.name === 'One hand')!.effects).toEqual([{ type: 'ability', name: 'Third Stance', key: 'Third Stance' }])
    })

    it('adds inches to combos', () => {
        expect(find('High Flyer').combos[0]).toMatchObject({ physical: 'Bounce', technical: 'Swiper', minInches: 79, maxInches: 79 })
    })

    it('leaves the bonus key out when the ability is unknown', () => {
        const unknown = buildBuildIndex({ builds, passives: [{ build: 'Reaper', effects: [{ type: 'bonus', slot: 'Ability1', name: 'Nope' }] }], abilities })
        expect(unknown.find(b => b.name === 'Reaper')!.effects).toEqual([{ type: 'bonus', name: 'Nope' }])
    })

    it('works with no effects stored', () => {
        expect(buildBuildIndex({ builds, abilities }).every(b => !b.hasEffects)).toBe(true)
    })
})
