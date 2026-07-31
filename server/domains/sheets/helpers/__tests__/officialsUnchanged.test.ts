import { describe, it, expect } from 'vitest'
import { officialsUnchanged } from '../officialsUnchanged'

describe('officialsUnchanged', () => {
  it('returns true for identical username sets', () => {
    expect(officialsUnchanged(['Alice', 'Bob'], ['alice', 'bob'])).toBe(true)
  })

  it('returns true when order differs', () => {
    expect(officialsUnchanged(['bob', 'alice'], ['alice', 'bob'])).toBe(true)
  })

  it('returns true for two empty lists', () => {
    expect(officialsUnchanged([], [])).toBe(true)
  })

  it('returns false when a username was added', () => {
    expect(officialsUnchanged(['alice'], ['alice', 'bob'])).toBe(false)
  })

  it('returns false when a username was removed', () => {
    expect(officialsUnchanged(['alice', 'bob'], ['alice'])).toBe(false)
  })

  it('returns false when a username was swapped for another of the same count', () => {
    expect(officialsUnchanged(['alice', 'bob'], ['alice', 'carol'])).toBe(false)
  })
})
