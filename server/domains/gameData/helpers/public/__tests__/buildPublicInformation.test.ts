import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { fixtureAbilities, fixtureDataset } from '../../../__tests__/fixtures/loadFixtures'
import type { GameTerm } from '../../../terms/types'
import { buildPublicInformation } from '../buildPublicInformation'

const abilities = fixtureAbilities()
const terms = JSON.parse(readFileSync(join(__dirname, '../../../__tests__/fixtures/terms.json'), 'utf8')) as GameTerm[]
const payloads = {
    abilities,
    rarities: fixtureDataset('rarities.txt', 'rarities'),
    physicals: fixtureDataset('attributes.txt', 'physicals'),
    technicals: fixtureDataset('attributes.txt', 'technicals'),
    heights: fixtureDataset('heights.txt', 'heights'),
}

describe('buildPublicInformation', () => {
    it('returns empty slices for empty input', () => {
        expect(buildPublicInformation({ payloads: {}, terms: [], settings: {} })).toEqual({
            abilities: { physical: [], technical: [] },
            inspectors: {},
            heights: [],
        })
    })

    it('fills abilities, heights and one inspector per rollable', () => {
        const info = buildPublicInformation({ payloads, terms, settings: {} })
        const rollables = [...info.abilities.physical, ...info.abilities.technical].flatMap(g => g.abilities)
        expect(rollables).toHaveLength(65)
        for (const a of rollables) expect(info.inspectors[a.key]?.kind).toBe(a.kind)
        expect(info.heights.map(c => c.foot)).toEqual([5, 6, 7])
    })

    it('adds an inspector for every resolved grant target', () => {
        const info = buildPublicInformation({ payloads, terms, settings: { 'Captains Call': 'derived' } })
        expect(info.inspectors["Captain's Jump"]).toMatchObject({ kind: 'exclusive' })
        expect(info.inspectors["Captain's Rec"]).toBeDefined()
    })

    it('stops grant chains at the first level', () => {
        const chained = abilities.map(a => (a.key === "Captain's Jump" ? { ...a, params: { CallTeamNerfedStance: 1 } } : a))
        const info = buildPublicInformation({ payloads: { ...payloads, abilities: chained }, terms, settings: { 'Captains Call': 'derived' } })
        expect(info.inspectors["Captain's Jump"]).toBeDefined()
        expect(info.inspectors['Nerfed Stance']).toBeUndefined()
    })
})
