import { describe, expect, it } from 'vitest'
import { crossCheckBuilds } from '../crossCheckBuilds'
import { fixtureAbilities, fixtureDataset } from '../../../__tests__/fixtures/loadFixtures'
import type { Build, GameDatasetPayloads } from '../../../types/datasets'

const real = (): Partial<GameDatasetPayloads> => ({
    builds: fixtureDataset('builds.txt', 'builds'),
    buildPassives: fixtureDataset('build-passives.txt', 'buildPassives'),
    heights: fixtureDataset('heights.txt', 'heights'),
    abilities: fixtureAbilities(),
    physicals: fixtureDataset('attributes.txt', 'physicals'),
    technicals: fixtureDataset('attributes.txt', 'technicals'),
    rarities: fixtureDataset('rarities.txt', 'rarities'),
})

const build = (patch: Partial<Build['combos'][number]> = {}, rarity = 'Rare'): Build => ({
    name: 'Test Build',
    rarity,
    combos: [{ physical: 'Cannon', technical: 'Feint', minHeight: 1.1, maxHeight: 1.2, ...patch }],
})

const withBuild = (b: Build) => {
    const sets = real()
    return { ...sets, builds: [...sets.builds!, b] }
}

const messagesFor = (issues: ReturnType<typeof crossCheckBuilds>, entry: string) => issues.filter(i => i.entry === entry).map(i => i.message)

describe('crossCheckBuilds', () => {
    it('finds nothing wrong with the real data', () => {
        expect(crossCheckBuilds(real())).toEqual([])
    })

    it('flags a physical that is not rollable', () => {
        const issues = crossCheckBuilds(withBuild(build({ physical: 'Nope' })))
        expect(issues).toEqual([expect.objectContaining({ level: 'warning', kind: 'builds', entry: 'Test Build' })])
        expect(issues[0].message).toContain('Nope')
    })

    it('flags None as a physical or technical', () => {
        const issues = crossCheckBuilds(withBuild(build({ physical: 'None', technical: 'None' })))
        expect(messagesFor(issues, 'Test Build')).toHaveLength(2)
    })

    it('flags an unknown rarity', () => {
        const issues = crossCheckBuilds(withBuild(build({}, 'Legendary')))
        expect(messagesFor(issues, 'Test Build')).toEqual([expect.stringContaining('Legendary')])
    })

    it('matches heights within float noise but not between steps', () => {
        expect(crossCheckBuilds(withBuild(build({ minHeight: 1.0250000001, maxHeight: 1.05 })))).toEqual([])
        const issues = crossCheckBuilds(withBuild(build({ minHeight: 1.03, maxHeight: 1.05 })))
        expect(messagesFor(issues, 'Test Build')).toEqual([expect.stringContaining('1.03')])
    })

    it('flags overlapping combos across builds', () => {
        const issues = crossCheckBuilds(withBuild(build({ physical: 'Bounce', technical: 'Swiper', minHeight: 1.35, maxHeight: 1.4 })))
        expect(issues).toHaveLength(1)
        expect(issues[0].message).toContain('High Flyer')
        expect(issues[0].message).toContain('Test Build')
    })

    it('flags effects for a build that does not exist', () => {
        const sets = real()
        const issues = crossCheckBuilds({ ...sets, buildPassives: [...sets.buildPassives!, { build: 'Ghost', effects: [] }] })
        expect(issues).toEqual([expect.objectContaining({ level: 'warning', kind: 'buildPassives', entry: 'Ghost' })])
    })

    it('skips the join check when builds are unknown', () => {
        const sets = real()
        delete sets.builds
        expect(crossCheckBuilds({ ...sets, buildPassives: [...sets.buildPassives!, { build: 'Ghost', effects: [] }] })).toEqual([])
    })

    it('joins effects to builds ignoring case and spaces', () => {
        const sets = real()
        expect(crossCheckBuilds({ ...sets, buildPassives: [{ build: ' one HAND ', effects: [] }] })).toEqual([])
    })

    it('flags a bonus ability missing from the catalog', () => {
        const sets = real()
        const issues = crossCheckBuilds({ ...sets, buildPassives: [{ build: 'Reaper', effects: [{ type: 'bonus', slot: 'Ability1', name: 'Nope' }] }] })
        expect(issues).toEqual([expect.objectContaining({ level: 'warning', kind: 'buildPassives', entry: 'Reaper' })])
    })
})
