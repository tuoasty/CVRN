import { describe, expect, it } from 'vitest'
import { normalizeWeights, weightTotal } from '../normalizeWeights'

describe('normalizeWeights', () => {
    it('leaves whole weights that already total 100 untouched', () => {
        const w = { scoring: 20, spiking: 30, setting: 5, blocking: 10, receiving: 25, serving: 10 }
        expect(normalizeWeights(w)).toBe(w)
    })

    it('rescales old-style weights to whole numbers totalling 100', () => {
        const result = normalizeWeights({ scoring: 2, spiking: 3, setting: 0.5, blocking: 1, receiving: 2, serving: 1 })
        expect(weightTotal(result)).toBe(100)
        expect(result.spiking).toBe(32)
        expect(Object.values(result).every(Number.isInteger)).toBe(true)
    })

    it('spreads evenly when every weight is zero', () => {
        const result = normalizeWeights({ scoring: 0, spiking: 0, setting: 0, blocking: 0, receiving: 0, serving: 0 })
        expect(weightTotal(result)).toBe(100)
        expect(Math.max(...Object.values(result)) - Math.min(...Object.values(result))).toBeLessThanOrEqual(1)
    })
})
