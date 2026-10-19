import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildImportPreview } from '../../buildImportPreview'
import { buildAbilityIndex } from '../buildAbilityIndex'
import type { GameDatasetPayloads } from '../../../types/datasets'
import type { AbilityIndexEntry } from '../../../types/abilityIndex'

const fixture = (name: string) => readFileSync(join(__dirname, '../../../__tests__/fixtures', name), 'utf8')

function loadPayloads(): Omit<GameDatasetPayloads, 'specLoadouts'> {
    const preview = buildImportPreview([fixture('rarities.txt'), fixture('abilities.txt'), fixture('attributes.txt')].join('\n\n'))
    if (preview.status !== 'ok') throw new Error(preview.error.message)
    const payload = <K extends keyof GameDatasetPayloads>(kind: K) =>
        preview.datasets.find(d => d.kind === kind)!.payload as GameDatasetPayloads[K]
    return {
        rarities: payload('rarities'),
        abilities: payload('abilities'),
        physicals: payload('physicals'),
        technicals: payload('technicals'),
    }
}

describe('buildAbilityIndex with the real files', () => {
    const payloads = loadPayloads()
    const index = buildAbilityIndex(payloads)
    const byKey = new Map(index.map(e => [e.key, e]))
    const get = (key: string) => byKey.get(key) as AbilityIndexEntry

    it('keeps catalog order and size', () => {
        expect(index.map(e => e.key)).toEqual(payloads.abilities.map(a => a.key))
    })

    it('marks every rollable with its list and rarity', () => {
        for (const { value, weight } of payloads.physicals.filter(p => p.value !== 'None')) {
            expect(get(value)).toMatchObject({ availability: 'physical', weight })
            expect(get(value).rarity).toBeDefined()
        }
        for (const { value } of payloads.technicals.filter(t => t.value !== 'None')) {
            expect(get(value).availability).toBe('technical')
        }
        expect(get('Bounce')).toMatchObject({ availability: 'physical', rarity: 'Mythical', weight: 2 })
    })

    it('treats non-rollables as exclusive with no rarity', () => {
        expect(get('Buffed Spin Control')).toMatchObject({ availability: 'exclusive', variantOf: 'Spin Control', modifier: 'Buffed' })
        expect(get('Buffed Spin Control').rarity).toBeUndefined()
        expect(get('Nerfed Bounce')).toMatchObject({ availability: 'exclusive', variantOf: 'Bounce', modifier: 'Nerfed' })
        expect(get('Team Nerfed Bounce').variantOf).toBeUndefined()
        expect(get('Captains Call - Wall').variantOf).toBeUndefined()
        expect(get('Slightly Negates Too Low').variantOf).toBeUndefined()
        expect(get('Special - Perfection').variantOf).toBeUndefined()
    })

    it('resolves team and aura grants to keys or keeps text', () => {
        expect(get('Special - Leader').grants).toEqual([
            { name: "Leader's Power", key: "Leader's Power", source: 'team' },
            { name: "Leader's Jump", key: "Leader's Jump", source: 'team' },
        ])
        const textGrants = index.flatMap(e => e.grants).filter(g => !g.key).map(g => g.name)
        expect(textGrants).toEqual(expect.arrayContaining(['+0.2 Power', '+0.3 Top Hitbox', '+0.25 Block Width']))
    })

    it('flags actives and toggles', () => {
        expect(index.some(e => e.isActive)).toBe(true)
        expect(index.some(e => e.isToggle)).toBe(true)
    })
})
