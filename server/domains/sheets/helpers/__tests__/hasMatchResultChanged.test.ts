import { describe, it, expect } from 'vitest'
import { hasMatchResultChanged } from '../hasMatchResultChanged'

const existing = (sets: [number, number, number][]) =>
  sets.map(([set_number, home_score, away_score]) => ({ set_number, home_score, away_score }))

const incoming = (sets: [number, number, number][]) =>
  sets.map(([setNumber, homeScore, awayScore]) => ({ setNumber, homeScore, awayScore }))

describe('hasMatchResultChanged', () => {
  it('returns false for identical sets and forfeit flag', () => {
    const a = existing([[1, 25, 20], [2, 25, 18]])
    const b = incoming([[1, 25, 20], [2, 25, 18]])
    expect(hasMatchResultChanged(a, false, b, false)).toBe(false)
  })

  it('returns false when sets arrive in a different order', () => {
    const a = existing([[2, 25, 18], [1, 25, 20]])
    const b = incoming([[1, 25, 20], [2, 25, 18]])
    expect(hasMatchResultChanged(a, false, b, false)).toBe(false)
  })

  it('returns true when a set score differs', () => {
    const a = existing([[1, 25, 20], [2, 25, 18]])
    const b = incoming([[1, 25, 21], [2, 25, 18]])
    expect(hasMatchResultChanged(a, false, b, false)).toBe(true)
  })

  it('returns true when only the forfeit flag differs', () => {
    const a = existing([[1, 25, 0], [2, 25, 0]])
    const b = incoming([[1, 25, 0], [2, 25, 0]])
    expect(hasMatchResultChanged(a, false, b, true)).toBe(true)
  })

  it('returns true when the set count differs', () => {
    const a = existing([[1, 25, 20], [2, 25, 18]])
    const b = incoming([[1, 25, 20], [2, 25, 18], [3, 15, 10]])
    expect(hasMatchResultChanged(a, false, b, false)).toBe(true)
  })

  it('returns false for two empty set lists', () => {
    expect(hasMatchResultChanged([], false, [], false)).toBe(false)
  })
})
