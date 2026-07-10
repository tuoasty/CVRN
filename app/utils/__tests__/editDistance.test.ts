import { describe, it, expect } from 'vitest'
import { editDistance } from '../editDistance'

describe('editDistance', () => {
  it('is zero for identical strings, ignoring case', () => {
    expect(editDistance('godwaffle', 'godwaffle')).toBe(0)
    expect(editDistance('GodWaffle', 'godwaffle')).toBe(0)
  })

  it('counts a single substitution', () => {
    expect(editDistance('godwaffle', 'godwaffie')).toBe(1)
  })

  it('counts insertions and deletions', () => {
    expect(editDistance('godwaffle', 'godwaffl')).toBe(1)
    expect(editDistance('godwaffle', 'god_waffle')).toBe(1)
  })

  it('handles empty strings', () => {
    expect(editDistance('', 'kevin')).toBe(5)
    expect(editDistance('kevin', '')).toBe(5)
    expect(editDistance('', '')).toBe(0)
  })

  it('is symmetric', () => {
    expect(editDistance('kevin', 'zacky')).toBe(editDistance('zacky', 'kevin'))
  })

  it('ranks a typo closer than an unrelated roster name', () => {
    expect(editDistance('godwaffle', 'godwaffie'))
      .toBeLessThan(editDistance('godwaffle', 'budi'))
  })
})
