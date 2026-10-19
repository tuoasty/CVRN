import { describe, expect, it } from 'vitest'
import type { PublicBuild, PublicBuildCatalog } from '@/server/domains/gameData'
import { filterBuilds, parseBuildFilters } from '../filterBuilds'

function build(name: string, rarity: string, combos: [string, string, number, number][]): PublicBuild {
    return {
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        rarity,
        combos: combos.map(([physical, technical, minInches, maxInches]) => ({
            physical,
            physicalSlug: physical.toLowerCase(),
            technical,
            technicalSlug: technical.toLowerCase(),
            minInches,
            maxInches,
            heightLabel: '',
        })),
        effects: [],
        parts: [],
    }
}

const catalog: PublicBuildCatalog = {
    groups: [
        { rarity: 'Epic', builds: [build('Tyrant', 'Epic', [['Cannon', 'Wreckage', 78, 80]])] },
        {
            rarity: 'Rare',
            builds: [
                build('Bandit', 'Rare', [['Solid', 'Breathing', 65, 74], ['Swift', 'Recovery', 65, 74]]),
                build('Reaper', 'Rare', [['Cannon', 'Wiper', 70, 72]]),
                build('Twin A', 'Rare', [['Athletic', 'Setter', 70, 70]]),
                build('Twin B', 'Rare', [['Athletic', 'Setter', 70, 70]]),
            ],
        },
    ],
    physicals: ['cannon', 'solid', 'swift', 'athletic'].map(slug => ({ slug, name: slug, rarity: 'Rare' })),
    technicals: ['wreckage', 'breathing', 'recovery', 'wiper', 'setter'].map(slug => ({ slug, name: slug, rarity: 'Rare' })),
    heights: [65, 70, 72, 74, 78, 80].map(inches => ({ inches, value: 0, label: '', weight: 1, pct: 1, fill: 1, game: '' })),
}

const names = (groups: PublicBuildCatalog['groups']) => groups.flatMap(g => g.builds.map(b => b.name))

describe('filterBuilds', () => {
    it('returns every build when nothing is set', () => {
        expect(names(filterBuilds(catalog, {}).groups)).toEqual(['Tyrant', 'Bandit', 'Reaper', 'Twin A', 'Twin B'])
    })

    it('requires one combo to satisfy every filter together', () => {
        expect(names(filterBuilds(catalog, { physical: 'solid', technical: 'recovery' }).groups)).toEqual([])
        expect(names(filterBuilds(catalog, { physical: 'swift', technical: 'recovery' }).groups)).toEqual(['Bandit'])
    })

    it('includes the height range at both ends', () => {
        expect(names(filterBuilds(catalog, { height: 70 }).groups)).toEqual(['Bandit', 'Reaper', 'Twin A', 'Twin B'])
        expect(names(filterBuilds(catalog, { height: 72 }).groups)).toEqual(['Bandit', 'Reaper'])
        expect(names(filterBuilds(catalog, { height: 80 }).groups)).toEqual(['Tyrant'])
    })

    it('matches q against build names only, ignoring case', () => {
        expect(names(filterBuilds(catalog, { q: 'REAP' }).groups)).toEqual(['Reaper'])
        expect(names(filterBuilds(catalog, { q: 'cannon' }).groups)).toEqual([])
    })

    it('removes empty groups', () => {
        expect(filterBuilds(catalog, { physical: 'cannon', technical: 'wreckage' }).groups.map(g => g.rarity)).toEqual(['Epic'])
    })

    it('names the exact build only when all three are set and one build matches', () => {
        expect(filterBuilds(catalog, { physical: 'cannon', technical: 'wiper', height: 71 }).exact).toBe('reaper')
        expect(filterBuilds(catalog, { physical: 'cannon', technical: 'wiper' }).exact).toBeNull()
        expect(filterBuilds(catalog, { physical: 'athletic', technical: 'setter', height: 70 }).exact).toBeNull()
        expect(filterBuilds(catalog, { physical: 'cannon', technical: 'setter', height: 70 }).exact).toBeNull()
    })
})

describe('parseBuildFilters', () => {
    it('reads known slugs and heights', () => {
        const params = new URLSearchParams('physical=cannon&technical=wiper&height=72')
        expect(parseBuildFilters(params, catalog)).toEqual({ physical: 'cannon', technical: 'wiper', height: 72 })
    })

    it('drops stale slugs and unknown heights', () => {
        const params = new URLSearchParams('physical=gone&technical=wiper&height=99')
        expect(parseBuildFilters(params, catalog)).toEqual({ technical: 'wiper' })
        expect(parseBuildFilters(new URLSearchParams('height=abc'), catalog)).toEqual({})
    })
})
