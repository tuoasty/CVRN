import { describe, expect, it } from 'vitest'
import { computeOverall } from '../computeOverall'
import { CategoryRanks, CategoryWeights } from '../../types'

const ranks = (r: Partial<CategoryRanks> = {}): CategoryRanks => ({
    scoring: 0, spiking: 0, setting: 0, blocking: 0, receiving: 0, serving: 0, ...r,
})
const weights = (w: Partial<CategoryWeights> = {}): CategoryWeights => ({
    scoring: 0, spiking: 0, setting: 0, blocking: 0, receiving: 0, serving: 0, ...w,
})
const scale = (w: Partial<CategoryWeights>, extra: { floor?: number; ceil?: number; curve?: number } = {}) => ({
    weights: weights(w), floor: 40, ceil: 99, curve: 1, ...extra,
})

describe('computeOverall', () => {
    it('maps a percentile linearly between floor and ceil when curve is 1', () => {
        const { attributes } = computeOverall(ranks({ spiking: 0.5 }), scale({ spiking: 1 }))
        expect(attributes.spiking).toBe(Math.round(40 + 59 * 0.5))
        expect(attributes.scoring).toBe(40)
    })

    it('hits the ceiling at the top percentile and the floor at the bottom', () => {
        const { ovr, attributes } = computeOverall(ranks({ spiking: 1 }), scale({ spiking: 1 }))
        expect(attributes.spiking).toBe(99)
        expect(ovr).toBe(99)
        expect(computeOverall(ranks(), scale({ spiking: 1 })).ovr).toBe(40)
    })

    it('blends categories by weight', () => {
        const { ovr } = computeOverall(ranks({ spiking: 1, receiving: 0 }), scale({ spiking: 3, receiving: 1 }))
        expect(ovr).toBe(Math.round(40 + 59 * 0.75))
    })

    it('ignores categories with zero weight', () => {
        const a = computeOverall(ranks({ setting: 1, blocking: 0 }), scale({ setting: 1 }))
        const b = computeOverall(ranks({ setting: 1, blocking: 1 }), scale({ setting: 1 }))
        expect(a.ovr).toBe(b.ovr)
    })

    it('returns the floor when every weight is zero', () => {
        expect(computeOverall(ranks({ scoring: 1 }), scale({})).ovr).toBe(40)
    })

    it('treats a missing rank as the bottom percentile', () => {
        const { ovr, attributes } = computeOverall(ranks({ scoring: null }), scale({ scoring: 1 }))
        expect(attributes.scoring).toBe(40)
        expect(ovr).toBe(40)
    })

    it('a curve above 1 pulls mid percentiles down without moving the ends', () => {
        const curved = computeOverall(ranks({ spiking: 0.5 }), scale({ spiking: 1 }, { curve: 2 }))
        expect(curved.attributes.spiking).toBe(Math.round(40 + 59 * 0.25))
        expect(computeOverall(ranks({ spiking: 1 }), scale({ spiking: 1 }, { curve: 2 })).ovr).toBe(99)
    })
})
