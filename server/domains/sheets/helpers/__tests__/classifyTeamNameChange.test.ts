import { describe, it, expect } from 'vitest'
import { classifyTeamNameChange } from '../classifyTeamNameChange'

const roster = (n: number, prefix = 'p') =>
  Array.from({ length: n }, (_, i) => `${prefix}${i}`)

describe('classifyTeamNameChange', () => {
  it('rebrand: same captain, roster fully rebuilt around them', () => {
    const old = ['cap', ...roster(17, 'old')]
    const next = ['cap', ...roster(17, 'new')]
    expect(
      classifyTeamNameChange({ usernames: old }, { usernames: next, captain: 'cap' })
    ).toBe('rebrand')
  })

  it('rebrand: new captain was a regular member of the old team (promotion)', () => {
    const old = ['oldcap', 'member', ...roster(16, 'old')]
    const next = ['member', ...roster(17, 'new')]
    expect(
      classifyTeamNameChange({ usernames: old }, { usernames: next, captain: 'member' })
    ).toBe('rebrand')
  })

  it('disband: 18 -> 18 all new people, new captain is an outsider', () => {
    const old = roster(18, 'old')
    const next = roster(18, 'new')
    expect(
      classifyTeamNameChange({ usernames: old }, { usernames: next, captain: 'new0' })
    ).toBe('disband')
  })

  it('disband: roster reduced to only a brand-new captain', () => {
    const old = roster(18, 'old')
    expect(
      classifyTeamNameChange({ usernames: old }, { usernames: ['newcap'], captain: 'newcap' })
    ).toBe('disband')
  })

  it('rebrand: reduced to only the captain, but that captain was on the old team', () => {
    const old = ['cap', ...roster(17, 'old')]
    expect(
      classifyTeamNameChange({ usernames: old }, { usernames: ['cap'], captain: 'cap' })
    ).toBe('rebrand')
  })

  it('disband: outsider captain, only 2 of 18 carried over (below threshold)', () => {
    const old = roster(18, 'old')
    const next = ['newcap', 'old0', 'old1', ...roster(15, 'new')]
    expect(
      classifyTeamNameChange({ usernames: old }, { usernames: next, captain: 'newcap' })
    ).toBe('disband')
  })

  it('rebrand: outsider captain but most of the roster stayed (above threshold)', () => {
    const old = roster(18, 'old')
    const next = ['newcap', ...roster(17, 'old')] 
    expect(
      classifyTeamNameChange({ usernames: old }, { usernames: next, captain: 'newcap' })
    ).toBe('rebrand')
  })

  it('rebrand: empty old roster (nothing to disband)', () => {
    expect(
      classifyTeamNameChange({ usernames: [] }, { usernames: roster(18), captain: 'p0' })
    ).toBe('rebrand')
  })

  it('rebrand: growth — small old roster is a subset of the new one', () => {
    const old = ['a', 'b']
    const next = ['a', 'b', ...roster(16, 'new')]
    expect(
      classifyTeamNameChange({ usernames: old }, { usernames: next, captain: 'c' })
    ).toBe('rebrand')
  })

  it('disband: no captain designated on the sheet, roster fully replaced', () => {
    const old = roster(18, 'old')
    const next = roster(18, 'new')
    expect(
      classifyTeamNameChange({ usernames: old }, { usernames: next, captain: null })
    ).toBe('disband')
  })
})
