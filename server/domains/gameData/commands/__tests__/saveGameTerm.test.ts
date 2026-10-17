import { describe, expect, it } from 'vitest'
import { buildSaveTermRow } from '../saveGameTerm'

const keys = new Set(["Captain's Jump", 'Bounce'])
const input = { kind: 'param' as const, tag: 'CallNew', category: 'team' as const, label: '', unit: null, template: ' Team gets {text} ', grants: "captain's jump" }

describe('buildSaveTermRow', () => {
    it('normalizes, canonicalizes grants and keeps verified from the stored row', () => {
        const row = buildSaveTermRow(input, { verified: true }, keys, 'user-1')
        expect(row).toEqual({ ok: true, value: { kind: 'param', tag: 'CallNew', category: 'team', label: null, unit: null, template: 'Team gets {text}', grants: "Captain's Jump", verified: true, updated_by: 'user-1' } })
    })

    it('starts new terms unverified', () => {
        const row = buildSaveTermRow(input, null, keys, 'user-1')
        expect(row.ok && row.value.verified).toBe(false)
    })

    it('returns every validation message', () => {
        const row = buildSaveTermRow({ ...input, template: '{foo}', grants: 'Nope' }, null, keys, 'user-1')
        expect(row).toEqual({ ok: false, error: { message: 'Unknown placeholder {foo}. No ability called "Nope"', code: 'VALIDATION_ERROR' } })
    })
})
