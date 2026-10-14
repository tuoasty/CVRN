import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { diffDataset, stableStringify } from '../datasets/diffDataset'
import { buildImportPreview } from '../buildImportPreview'
import type { Ability, AttributeEntry } from '../../types/datasets'

const fixture = (name: string) => readFileSync(join(__dirname, '../../__tests__/fixtures', name), 'utf8')

function abilitiesFrom(text: string): Ability[] {
    const preview = buildImportPreview(text)
    if (preview.status !== 'ok') throw new Error('fixture failed to parse')
    return preview.datasets[0].payload as Ability[]
}

const jsonbRoundTrip = <T>(value: T): T => JSON.parse(stableStringify(value))

describe('diffDataset', () => {
    const abilities = abilitiesFrom(fixture('abilities.txt'))

    it('ignores object key order from jsonb', () => {
        expect(diffDataset('abilities', jsonbRoundTrip(abilities), abilities).unchanged).toBe(true)
    })

    it('reports exactly one changed entry after editing one value', () => {
        const edited = abilitiesFrom(fixture('abilities.txt').replace('"Your dives travel 25% farther."', '"edited"'))
        expect(diffDataset('abilities', abilities, edited)).toEqual({ added: [], removed: [], changed: ['Butterman'], reordered: false, unchanged: false })
    })

    it('reports added, removed and reordered entries', () => {
        const before: AttributeEntry[] = [{ value: 'A', weight: 2 }, { value: 'B', weight: 8 }, { value: 'C', weight: 20 }]
        const after: AttributeEntry[] = [{ value: 'C', weight: 20 }, { value: 'A', weight: 2 }, { value: 'D', weight: 30 }]
        expect(diffDataset('physicals', before, after)).toEqual({ added: ['D'], removed: ['B'], changed: [], reordered: true, unchanged: false })
    })
})

describe('preview against stored', () => {
    it('marks a re-pasted dataset as unchanged and nothing to publish', () => {
        const text = fixture('rarities.txt')
        const first = buildImportPreview(text)
        if (first.status !== 'ok') throw new Error('fixture failed to parse')
        expect(first.datasets[0].diff).toBeNull()
        expect(first.hasChanges).toBe(true)

        const again = buildImportPreview(text, { rarities: jsonbRoundTrip(first.datasets[0].payload) as never })
        if (again.status !== 'ok') throw new Error('fixture failed to parse')
        expect(again.datasets[0].diff?.unchanged).toBe(true)
        expect(again.hasChanges).toBe(false)
        expect(again.canPublish).toBe(true)
    })
})
