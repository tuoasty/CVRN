import { describe, it, expect } from 'vitest'
import { parseTeamsSheet } from '../parseTeamsSheet'

// Helpers to build minimal sheet row arrays
function makeRows(rowCount: number): string[][] {
  return Array.from({ length: rowCount }, () => [])
}

function setCell(rows: string[][], rowIdx: number, colIdx: number, value: string) {
  while (rows[rowIdx].length <= colIdx) rows[rowIdx].push('')
  rows[rowIdx][colIdx] = value
}

// Default stride=4: col offsets per slot are 0, 4, 8, 12, 16
// Within each slot: col+1 = team number, col+2 = team name / player username, col+1 = player role

describe('parseTeamsSheet', () => {
  it('returns empty array for empty input', () => {
    expect(parseTeamsSheet([], 1, 18)).toEqual([])
  })

  it('parses single team in slot 0 with explicit team number', () => {
    const rows = makeRows(3)
    // headerRow=1 → headerRowIdx=0, stride=4 (default), slot 0 → col=0
    setCell(rows, 0, 1, '7')          // team number
    setCell(rows, 0, 2, 'TeamAlpha')  // team name
    setCell(rows, 1, 1, 'C')
    setCell(rows, 1, 2, 'PlayerOne')
    setCell(rows, 2, 2, 'PlayerTwo')  // no role tag → player

    const result = parseTeamsSheet(rows, 1, 18)

    expect(result).toHaveLength(1)
    expect(result[0].teamNumber).toBe(7)
    expect(result[0].teamName).toBe('TeamAlpha')
    expect(result[0].headerCol).toBe(0)
    expect(result[0].players).toHaveLength(2)
  })

  it('falls back to derived team number when col+1 is empty', () => {
    // k=0, slot=0 → derived = 0*5+0+1 = 1
    const rows = makeRows(2)
    setCell(rows, 0, 2, 'NoBadge')

    const result = parseTeamsSheet(rows, 1, 18)

    expect(result[0].teamNumber).toBe(1)
  })

  it('maps all role tags correctly', () => {
    const rows = makeRows(5)
    setCell(rows, 0, 2, 'RoleTeam')
    setCell(rows, 1, 1, 'C')
    setCell(rows, 1, 2, 'Cap')
    setCell(rows, 2, 1, 'VC')
    setCell(rows, 2, 2, 'ViceCap')
    setCell(rows, 3, 1, 'CC')
    setCell(rows, 3, 2, 'CourtCap')
    setCell(rows, 4, 1, '')
    setCell(rows, 4, 2, 'Regular')

    const players = parseTeamsSheet(rows, 1, 18)[0].players

    expect(players[0].role).toBe('captain')
    expect(players[1].role).toBe('vice_captain')
    expect(players[2].role).toBe('court_captain')
    expect(players[3].role).toBe('player')
  })

  it('parses 5 teams across one header row with stride=4', () => {
    const rows = makeRows(2)
    for (let slot = 0; slot < 5; slot++) {
      const col = slot * 4
      setCell(rows, 0, col + 1, String(slot + 1))
      setCell(rows, 0, col + 2, `Team${slot + 1}`)
      setCell(rows, 1, col + 2, `Player${slot + 1}`)
    }

    const result = parseTeamsSheet(rows, 1, 18, 4)

    expect(result).toHaveLength(5)
    for (let i = 0; i < 5; i++) {
      expect(result[i].teamName).toBe(`Team${i + 1}`)
      expect(result[i].headerCol).toBe(i * 4)
    }
  })

  it('silently skips empty slots (disbanded team gap) — no error', () => {
    // Slot 0 empty, slots 1 and 2 have teams
    const rows = makeRows(2)
    setCell(rows, 0, 4 + 2, 'TeamB')   // slot 1, col=4
    setCell(rows, 0, 8 + 2, 'TeamC')   // slot 2, col=8

    const result = parseTeamsSheet(rows, 1, 18, 4)

    expect(result).toHaveLength(2)
    expect(result[0].teamName).toBe('TeamB')
    expect(result[1].teamName).toBe('TeamC')
  })

  it('parses two block rows', () => {
    // headerRow=1, blockHeight=4 → block 0 at row 0, block 1 at row 4
    const rows = makeRows(8)
    setCell(rows, 0, 2, 'Block0Team')
    setCell(rows, 4, 2, 'Block1Team')

    const result = parseTeamsSheet(rows, 1, 4, 4)

    expect(result).toHaveLength(2)
    expect(result[0].teamName).toBe('Block0Team')
    expect(result[1].teamName).toBe('Block1Team')
  })

  it('stops when headerRowIdx >= rows.length', () => {
    // 1 row only — only block 0 fits (headerRowIdx=0), block 1 at row 18 is out of bounds
    const rows = makeRows(1)
    setCell(rows, 0, 2, 'OnlyTeam')

    const result = parseTeamsSheet(rows, 1, 18, 4)

    expect(result).toHaveLength(1)
  })

  it('stops iteration when header row has no team names', () => {
    // Rows exist but no team names → hasAnyTeam false → break
    const rows = makeRows(5)

    const result = parseTeamsSheet(rows, 1, 18, 4)

    expect(result).toEqual([])
  })

  it('skips player rows with empty username', () => {
    const rows = makeRows(4)
    setCell(rows, 0, 2, 'SparseTeam')
    setCell(rows, 1, 2, 'Player1')
    // row 2 intentionally empty
    setCell(rows, 3, 2, 'Player3')

    const players = parseTeamsSheet(rows, 1, 18, 4)[0].players

    expect(players).toHaveLength(2)
    expect(players.map(p => p.username)).toEqual(['Player1', 'Player3'])
  })

  it('caps players at 16 rows regardless of row count', () => {
    // 18 rows after header — only rows 1–16 scanned (PLAYER_ROWS=16)
    const rows = makeRows(19)
    setCell(rows, 0, 2, 'BigTeam')
    for (let r = 1; r <= 17; r++) {
      setCell(rows, r, 2, `P${r}`)
    }

    const players = parseTeamsSheet(rows, 1, 18, 4)[0].players

    expect(players).toHaveLength(16)
  })

  it('uses custom blockStride correctly', () => {
    // stride=6: slot 0 col=0, slot 1 col=6, slot 2 col=12
    const rows = makeRows(2)
    setCell(rows, 0, 2, 'SlotA')   // slot 0, col=0
    setCell(rows, 0, 8, 'SlotB')   // slot 1, col=6 — col+2=8
    setCell(rows, 0, 14, 'SlotC')  // slot 2, col=12 — col+2=14

    const result = parseTeamsSheet(rows, 1, 18, 6)

    expect(result).toHaveLength(3)
    expect(result[0].headerCol).toBe(0)
    expect(result[1].headerCol).toBe(6)
    expect(result[2].headerCol).toBe(12)
  })

  it('rowNumber is 1-indexed (playerRowIdx + 1)', () => {
    // headerRow=9 → headerRowIdx=8, player at row 9 → rowNumber=10
    const rows = makeRows(10)
    setCell(rows, 8, 2, 'TN')
    setCell(rows, 9, 2, 'CheckRow')

    const players = parseTeamsSheet(rows, 9, 18, 4)[0].players

    expect(players[0].rowNumber).toBe(10)
  })

  it('handles short/missing row data without crashing', () => {
    // rows[0] is shorter than expected — no cols at slot positions
    const rows: string[][] = [[]]  // completely empty header row

    const result = parseTeamsSheet(rows, 1, 18, 4)

    expect(result).toEqual([])
  })
})
