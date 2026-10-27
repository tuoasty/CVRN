import { describe, expect, it } from 'vitest'
import { computeOverall, FULL_CREDIT_SETS, REPLACEMENT_PCT } from '../computeOverall'
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
const FULL = FULL_CREDIT_SETS

describe('computeOverall', () => {
    it('maps a percentile linearly between floor and ceil when curve is 1', () => {
        const { attributes } = computeOverall(ranks({ spiking: 0.5 }), scale({ spiking: 1 }), FULL)
        expect(attributes.spiking).toBe(Math.round(40 + 59 * 0.5))
        expect(attributes.scoring).toBe(40)
    })

    it('hits the ceiling at the top percentile and the floor at the bottom', () => {
        const { ovr, attributes } = computeOverall(ranks({ spiking: 1 }), scale({ spiking: 1 }), FULL)
        expect(attributes.spiking).toBe(99)
        expect(ovr).toBe(99)
        expect(computeOverall(ranks(), scale({ spiking: 1 }), FULL).ovr).toBe(40)
    })

    it('blends categories by weight', () => {
        const { ovr } = computeOverall(ranks({ spiking: 1, receiving: 0 }), scale({ spiking: 3, receiving: 1 }), FULL)
        expect(ovr).toBe(Math.round(40 + 59 * 0.75))
    })

    it('ignores categories with zero weight', () => {
        const a = computeOverall(ranks({ setting: 1, blocking: 0 }), scale({ setting: 1 }), FULL)
        const b = computeOverall(ranks({ setting: 1, blocking: 1 }), scale({ setting: 1 }), FULL)
        expect(a.ovr).toBe(b.ovr)
    })

    it('returns the floor when every weight is zero', () => {
        expect(computeOverall(ranks({ scoring: 1 }), scale({}), FULL).ovr).toBe(40)
    })

    it('treats a missing rank as the bottom percentile', () => {
        const { ovr, attributes } = computeOverall(ranks({ scoring: null }), scale({ scoring: 1 }), FULL)
        expect(attributes.scoring).toBe(40)
        expect(ovr).toBe(40)
    })

    it('a curve above 1 pulls mid percentiles down without moving the ends', () => {
        const curved = computeOverall(ranks({ spiking: 0.5 }), scale({ spiking: 1 }, { curve: 2 }), FULL)
        expect(curved.attributes.spiking).toBe(Math.round(40 + 59 * 0.25))
        expect(computeOverall(ranks({ spiking: 1 }), scale({ spiking: 1 }, { curve: 2 }), FULL).ovr).toBe(99)
    })
})

describe('computeOverall small-sample discount', () => {
    const top = (sets: number) => computeOverall(ranks({ spiking: 1 }), scale({ spiking: 1 }), sets)

    it('leaves players at or above the full-credit threshold untouched', () => {
        expect(top(FULL).ovr).toBe(99)
        expect(top(FULL + 10).ovr).toBe(99)
    })

    it('gives half credit above replacement level at half the threshold', () => {
        const pct = REPLACEMENT_PCT + 0.5 * (1 - REPLACEMENT_PCT)
        expect(top(FULL / 2).ovr).toBe(Math.round(40 + 59 * pct))
    })

    it('pulls a zero-set player down to replacement level', () => {
        expect(top(0).ovr).toBe(Math.round(40 + 59 * REPLACEMENT_PCT))
    })

    it('grows monotonically with sets played', () => {
        const ovrs = [0, 1, 2, 3, 4, 5, 6].map(n => top(n).ovr)
        expect([...ovrs].sort((a, b) => a - b)).toEqual(ovrs)
    })

    it('never raises a below-replacement player', () => {
        const low = computeOverall(ranks({ spiking: 0.2 }), scale({ spiking: 1 }), 1)
        expect(low.ovr).toBe(Math.round(40 + 59 * 0.2))
    })

    it('discounts attributes as well as the overall', () => {
        const { attributes } = computeOverall(ranks({ spiking: 1, receiving: 1 }), scale({ spiking: 1 }), 0)
        expect(attributes.receiving).toBe(Math.round(40 + 59 * REPLACEMENT_PCT))
    })

    it('treats a fifth-set-weighted count like any other', () => {
        expect(top(5.5).ovr).toBeLessThan(top(FULL).ovr)
    })
})
