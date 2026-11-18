import { describe, it, expect } from 'vitest'
import { parseQualifierRows } from '../parseQualifierRows'

const COL_HOME = 6
const COL_AWAY = 8
const GREEN = '#00b050'
const RED = '#ff0000'

function makeRow(overrides: Record<number, string>): string[] {
  const row: string[] = []
  const maxCol = Math.max(...Object.keys(overrides).map(Number))
  for (let c = 0; c <= maxCol; c++) row.push(overrides[c] ?? '')
  return row
}

function makeColors(overrides: Record<number, string>): (string | null)[] {
  const maxCol = Math.max(...Object.keys(overrides).map(Number))
  const colors: (string | null)[] = []
  for (let c = 0; c <= maxCol; c++) colors.push(overrides[c] ?? null)
  return colors
}

function parseOne(overrides: Record<number, string>, colorOverrides?: Record<number, string>) {
  const fgColors = colorOverrides ? [makeColors(colorOverrides)] : undefined
  const { results, errors } = parseQualifierRows([makeRow(overrides)], fgColors, 0)
  return { results, errors }
}

describe('parseQualifierRows — bye handling', () => {
  it.each(['(By round)', 'n/a', 'N/a', 'BYE', 'By Round', 'na'])(
    'flags away="%s" as a bye without erroring',
    (awayToken) => {
      const { results, errors } = parseOne({ 4: '1-M1', 6: 'Alpha', 8: awayToken })
      expect(errors).toHaveLength(0)
      expect(results).toHaveLength(1)
      expect(results[0].isByeAway).toBe(true)
      expect(results[0].homeTeamName).toBe('Alpha')
    }
  )

  it('does not flag a normal away team as a bye', () => {
    const { results, errors } = parseOne({ 4: '1-M1', 6: 'Alpha', 8: 'Beta' })
    expect(errors).toHaveLength(0)
    expect(results).toHaveLength(1)
    expect(results[0].isByeAway).toBe(false)
    expect(results[0].awayTeamName).toBe('Beta')
  })

  it('does not treat a typo\'d team name as a bye (leaves DB lookup to sync)', () => {
    const { results } = parseOne({ 4: '1-M1', 6: 'Alpha', 8: 'Byee' })
    expect(results).toHaveLength(1)
    expect(results[0].isByeAway).toBe(false)
  })

  it('flags a decorated bye token as a bye', () => {
    const { results, errors } = parseOne({ 4: '1-M1', 6: 'Alpha', 8: 'N/A \u{1F6AB}' })
    expect(errors).toHaveLength(0)
    expect(results[0].isByeAway).toBe(true)
  })

  it('strips emoji from home and away team names', () => {
    const { results, errors } = parseOne({ 4: '1-M1', 6: '\u{1F525} Alpha ', 8: 'Beta \u{1F1EC}\u{1F1E7}' })
    expect(errors).toHaveLength(0)
    expect(results[0].homeTeamName).toBe('Alpha')
    expect(results[0].awayTeamName).toBe('Beta')
  })

  it('still errors on a genuinely empty away cell', () => {
    const { results, errors } = parseOne({ 4: '1-M1', 6: 'Alpha', 8: '' })
    expect(results).toHaveLength(0)
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(/missing away team name/)
  })
})

describe('parseQualifierRows — double forfeit', () => {
  it('flags 0-0 sets as a double forfeit even when the note column says FF and the winner is NONE', () => {
    const { results, errors } = parseOne({ 4: '1-10', 6: 'Bankai', 8: 'Mongolz', 12: '0-0', 13: '0-0', 16: 'NONE', 17: 'FF' })
    expect(errors).toHaveLength(0)
    expect(results[0].isForfeit).toBe(true)
    expect(results[0].isDoubleForfeit).toBe(true)
  })

  it('flags 0-0 sets as a double forfeit without a note', () => {
    const { results } = parseOne({ 4: '1-10', 6: 'Bankai', 8: 'Mongolz', 12: '0 - 0', 13: '0-0', 14: 'xx' })
    expect(results[0].isForfeit).toBe(true)
    expect(results[0].isDoubleForfeit).toBe(true)
  })

  it('does not flag a single forfeit', () => {
    const { results } = parseOne({ 4: '1-2', 6: 'Nemesis', 8: 'Poullet', 12: '0 - 25', 13: '0 - 25', 16: 'Poullet', 17: 'FF' })
    expect(results[0].isForfeit).toBe(true)
    expect(results[0].isDoubleForfeit).toBe(false)
  })

  it('does not flag a row with no scores', () => {
    const { results } = parseOne({ 4: '1-3', 6: 'Alpha', 8: 'Beta' })
    expect(results[0].isForfeit).toBe(false)
    expect(results[0].isDoubleForfeit).toBe(false)
  })
})

describe('parseQualifierRows — color-driven score orientation', () => {
  const row = { 4: '1-M1', 6: 'Alpha', 8: 'Beta', 12: '25-20' }

  it('home name green + away red, green set → digits map straight to home/away', () => {
    const { results, errors } = parseOne(row, { [COL_HOME]: GREEN, [COL_AWAY]: RED, 12: GREEN })
    expect(errors).toHaveLength(0)
    expect(results[0].sets).toEqual([{ setNumber: 1, homeScore: 25, awayScore: 20 }])
  })

  it('red set (loser took the set) flips the order to the losing side', () => {

    const { results } = parseOne(row, { [COL_HOME]: GREEN, [COL_AWAY]: RED, 12: RED })
    expect(results[0].sets).toEqual([{ setNumber: 1, homeScore: 20, awayScore: 25 }])
  })

  it('away name green (away is the match winner), green set → higher score goes to away', () => {
    const { results } = parseOne(row, { [COL_HOME]: RED, [COL_AWAY]: GREEN, 12: GREEN })
    expect(results[0].sets).toEqual([{ setNumber: 1, homeScore: 20, awayScore: 25 }])
  })

  it('ignores digit order: reversed "20-25" green set still gives the winner the higher score', () => {
    const { results } = parseOne(
      { 4: '1-M1', 6: 'Alpha', 8: 'Beta', 12: '20-25' },
      { [COL_HOME]: GREEN, [COL_AWAY]: RED, 12: GREEN },
    )

    expect(results[0].sets).toEqual([{ setNumber: 1, homeScore: 25, awayScore: 20 }])
  })

  it('falls back to positional home-away when there are no colors', () => {
    const { results } = parseOne(row)
    expect(results[0].sets).toEqual([{ setNumber: 1, homeScore: 25, awayScore: 20 }])
  })

  it('falls back to positional per set when a set cell is uncolored but names are colored', () => {
    const { results } = parseOne(
      { 4: '1-M1', 6: 'Alpha', 8: 'Beta', 12: '25-20', 13: '25-20' },
      { [COL_HOME]: GREEN, [COL_AWAY]: RED, 13: RED }, 
    )
    expect(results[0].sets).toEqual([
      { setNumber: 1, homeScore: 25, awayScore: 20 }, 
      { setNumber: 2, homeScore: 20, awayScore: 25 }, 
    ])
  })
})
