import { describe, expect, it } from 'vitest'
import { upgradeStoredPayload } from '../upgradeStoredPayload'
import { crossCheckServeStyles } from '../../serveStyles/crossCheckServeStyles'
import type { SpecLoadout } from '../../../types/datasets'

const legacy = { key: 'A', name: 'A', height: 1, cooldown: 1, endOnSpike: false, maxPower: 1, activeMaxPower: 1, passive: [], active: [], tuning: [] }

describe('upgradeStoredPayload', () => {
    it.each(['specLoadouts', 'specLoadoutsPaid'] as const)('gives %s saved before styles existed an empty style list', kind => {
        const [loadout] = upgradeStoredPayload(kind, [legacy]) as SpecLoadout[]
        expect(loadout.styles).toEqual([])
    })

    it('keeps styles that are already there', () => {
        const [loadout] = upgradeStoredPayload('specLoadouts', [{ ...legacy, styles: [{ name: 'Curveball', value: 1 }] }]) as SpecLoadout[]
        expect(loadout.styles).toEqual([{ name: 'Curveball', value: 1 }])
    })

    it('leaves other kinds untouched', () => {
        const heights = [{ value: 1.5, weight: 2 }]
        expect(upgradeStoredPayload('heights', heights)).toBe(heights)
    })

    it('lets a serve style import cross-check against legacy stored loadouts', () => {
        const specLoadouts = upgradeStoredPayload('specLoadouts', [legacy]) as SpecLoadout[]
        expect(() => crossCheckServeStyles({ serveStyles: [{ name: 'Curveball' }], specLoadouts })).not.toThrow()
    })
})
