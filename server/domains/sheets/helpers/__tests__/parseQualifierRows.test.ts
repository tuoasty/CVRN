import { describe, it, expect } from 'vitest'
import { parseQualifierRows } from '../parseQualifierRows'

// Column layout (0-indexed) from parseQualifierRows:
//   E=4 code, G=6 home, I=8 away, K=10 schedule, M..Q=12..16 sets, S=18 winner, T=19 note
function makeRow(overrides: Record<number, string>): string[] {
  const row: string[] = []
  const maxCol = Math.max(...Object.keys(overrides).map(Number))
  for (let c = 0; c <= maxCol; c++) row.push(overrides[c] ?? '')
  return row
}

// headerRow=0 → data starts at index 0
function parseOne(overrides: Record<number, string>) {
  const { results, errors } = parseQualifierRows([makeRow(overrides)], 0)
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
