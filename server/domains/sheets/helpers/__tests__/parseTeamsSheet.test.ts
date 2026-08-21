import { describe, it, expect } from 'vitest'
import { parseTeamsSheet } from '../parseTeamsSheet'

function makeRows(rowCount: number): string[][] {
  return Array.from({ length: rowCount }, () => [])
}

function setCell(rows: string[][], rowIdx: number, colIdx: number, value: string) {
  while (rows[rowIdx].length <= colIdx) rows[rowIdx].push('')
  rows[rowIdx][colIdx] = value
}

describe('parseTeamsSheet', () => {
  it('returns empty array for empty input', () => {
    expect(parseTeamsSheet([], 1, 18)).toEqual([])
  })

  it('parses single team in slot 0 with explicit team number', () => {
    const rows = makeRows(3)

    setCell(rows, 0, 2, '7')          
    setCell(rows, 0, 3, 'TeamAlpha')  
    setCell(rows, 1, 2, 'C')
    setCell(rows, 1, 3, 'PlayerOne')
    setCell(rows, 2, 3, 'PlayerTwo')  

    const result = parseTeamsSheet(rows, 1, 18)

    expect(result).toHaveLength(1)
    expect(result[0].teamNumber).toBe(7)
    expect(result[0].teamName).toBe('TeamAlpha')
    expect(result[0].headerCol).toBe(1)
    expect(result[0].players).toHaveLength(2)
  })

  it('strips emoji and collapses whitespace from the team name', () => {
    const rows = makeRows(2)
    setCell(rows, 0, 3, '\u{1F525}  Team   Alpha ')  

    const result = parseTeamsSheet(rows, 1, 18)

    expect(result[0].teamName).toBe('Team Alpha')
  })

  it('treats an emoji-only team name as a cleared name', () => {
    const rows = makeRows(2)
    setCell(rows, 0, 3, '\u{1F525}')  
    setCell(rows, 1, 3, 'PlayerOne')

    const result = parseTeamsSheet(rows, 1, 18)

    expect(result).toHaveLength(1)
    expect(result[0].teamName).toBe('')
    expect(result[0].nameCleared).toBe(true)
    expect(result[0].players).toHaveLength(1)
  })

  it('falls back to derived team number when col+1 is empty', () => {

    const rows = makeRows(2)
    setCell(rows, 0, 3, 'NoBadge')  

    const result = parseTeamsSheet(rows, 1, 18)

    expect(result[0].teamNumber).toBe(1)
  })

  it('maps all role tags correctly', () => {
    const rows = makeRows(5)
    setCell(rows, 0, 3, 'RoleTeam')  
    setCell(rows, 1, 2, 'C')
    setCell(rows, 1, 3, 'Cap')
    setCell(rows, 2, 2, 'VC')
    setCell(rows, 2, 3, 'ViceCap')
    setCell(rows, 3, 2, 'CC')
    setCell(rows, 3, 3, 'CourtCap')
    setCell(rows, 4, 3, 'Regular')   

    const players = parseTeamsSheet(rows, 1, 18)[0].players

    expect(players[0].role).toBe('captain')
    expect(players[1].role).toBe('vice_captain')
    expect(players[2].role).toBe('court_captain')
    expect(players[3].role).toBe('player')
  })

  it('parses 5 teams across one header row with stride=4', () => {
    const rows = makeRows(2)
    for (let slot = 0; slot < 5; slot++) {
      const col = slot * 4 + 1  
      setCell(rows, 0, col + 1, String(slot + 1))
      setCell(rows, 0, col + 2, `Team${slot + 1}`)
      setCell(rows, 1, col + 2, `Player${slot + 1}`)
    }

    const result = parseTeamsSheet(rows, 1, 18, 4)

    expect(result).toHaveLength(5)
    for (let i = 0; i < 5; i++) {
      expect(result[i].teamName).toBe(`Team${i + 1}`)
      expect(result[i].headerCol).toBe(i * 4 + 1)
    }
  })

  it('silently skips empty slots (disbanded team gap) — no error', () => {

    const rows = makeRows(2)
    setCell(rows, 0, 7, 'TeamB')   
    setCell(rows, 0, 11, 'TeamC')  

    const result = parseTeamsSheet(rows, 1, 18, 4)

    expect(result).toHaveLength(2)
    expect(result[0].teamName).toBe('TeamB')
    expect(result[1].teamName).toBe('TeamC')
  })

  it('parses two block rows', () => {

    const rows = makeRows(8)
    setCell(rows, 0, 3, 'Block0Team')
    setCell(rows, 4, 3, 'Block1Team')

    const result = parseTeamsSheet(rows, 1, 4, 4)

    expect(result).toHaveLength(2)
    expect(result[0].teamName).toBe('Block0Team')
    expect(result[1].teamName).toBe('Block1Team')
  })

  it('stops when headerRowIdx >= rows.length', () => {

    const rows = makeRows(1)
    setCell(rows, 0, 3, 'OnlyTeam')  

    const result = parseTeamsSheet(rows, 1, 18, 4)

    expect(result).toHaveLength(1)
  })

  it('stops iteration when header row has no team names', () => {

    const rows = makeRows(5)

    const result = parseTeamsSheet(rows, 1, 18, 4)

    expect(result).toEqual([])
  })

  it('skips player rows with empty username', () => {
    const rows = makeRows(4)
    setCell(rows, 0, 3, 'SparseTeam')  
    setCell(rows, 1, 3, 'Player1')

    setCell(rows, 3, 3, 'Player3')

    const players = parseTeamsSheet(rows, 1, 18, 4)[0].players

    expect(players).toHaveLength(2)
    expect(players.map(p => p.username)).toEqual(['Player1', 'Player3'])
  })

  it('caps players at 18 rows regardless of row count', () => {

    const rows = makeRows(21)
    setCell(rows, 0, 3, 'BigTeam')  
    for (let r = 1; r <= 19; r++) {
      setCell(rows, r, 3, `P${r}`)
    }

    const players = parseTeamsSheet(rows, 1, 20, 4)[0].players

    expect(players).toHaveLength(18)
  })

  it('uses custom blockStride correctly', () => {

    const rows = makeRows(2)
    setCell(rows, 0, 3, 'SlotA')   
    setCell(rows, 0, 9, 'SlotB')   
    setCell(rows, 0, 15, 'SlotC')  

    const result = parseTeamsSheet(rows, 1, 18, 6)

    expect(result).toHaveLength(3)
    expect(result[0].headerCol).toBe(1)
    expect(result[1].headerCol).toBe(7)
    expect(result[2].headerCol).toBe(13)
  })

  it('rowNumber is 1-indexed (playerRowIdx + 1)', () => {

    const rows = makeRows(10)
    setCell(rows, 8, 3, 'TN')
    setCell(rows, 9, 3, 'CheckRow')

    const players = parseTeamsSheet(rows, 9, 18, 4)[0].players

    expect(players[0].rowNumber).toBe(10)
  })

  it('handles short/missing row data without crashing', () => {

    const rows: string[][] = [[]]  

    const result = parseTeamsSheet(rows, 1, 18, 4)

    expect(result).toEqual([])
  })

  it('returns nameCleared:true for empty-name slot that still has players', () => {
    const rows = makeRows(3)

    setCell(rows, 0, 2, '3')        

    setCell(rows, 1, 3, 'PlayerX')  

    setCell(rows, 0, 7, 'TeamB')

    const result = parseTeamsSheet(rows, 1, 18, 4)

    const cleared = result.find(r => r.teamNumber === 3)
    expect(cleared).toBeDefined()
    expect(cleared!.nameCleared).toBe(true)
    expect(cleared!.disbanded).toBe(false)
    expect(cleared!.teamName).toBe('')
    expect(cleared!.players).toHaveLength(1)
    expect(cleared!.players[0].username).toBe('PlayerX')
  })

  it('still skips slot when name is empty and no players', () => {
    const rows = makeRows(2)

    setCell(rows, 0, 7, 'TeamB')
    setCell(rows, 1, 7, 'PlayerB')

    const result = parseTeamsSheet(rows, 1, 18, 4)

    expect(result).toHaveLength(1)
    expect(result[0].teamName).toBe('TeamB')
  })

  it('active team result has nameCleared:false', () => {
    const rows = makeRows(2)
    setCell(rows, 0, 3, 'ActiveTeam')  

    const result = parseTeamsSheet(rows, 1, 18, 4)

    expect(result[0].nameCleared).toBe(false)
  })

  it('disbanded result has nameCleared:false', () => {
    const rows = makeRows(2)
    setCell(rows, 0, 3, 'DISBANDED')
    setCell(rows, 0, 7, 'TeamB')

    const result = parseTeamsSheet(rows, 1, 18, 4)

    const d = result.find(r => r.disbanded)
    expect(d).toBeDefined()
    expect(d!.nameCleared).toBe(false)
  })

  it('reads a valid position from col+3 and uppercases it', () => {
    const rows = makeRows(2)
    setCell(rows, 0, 3, 'PosTeam')
    setCell(rows, 1, 3, 'PlayerOne')
    setCell(rows, 1, 4, 'out')

    const player = parseTeamsSheet(rows, 1, 18, 4)[0].players[0]

    expect(player.position).toBe('OUT')
    expect(player.positionInvalid).toBe(false)
  })

  it('normalizes legacy position codes to canonical (OH -> OUT, MB -> MID, S -> SET, L -> LIB, OP -> OPP)', () => {
    const cases: [string, string][] = [
      ['oh', 'OUT'],
      ['out', 'OUT'],
      ['mb', 'MID'],
      ['mid', 'MID'],
      ['s', 'SET'],
      ['set', 'SET'],
      ['l', 'LIB'],
      ['lib', 'LIB'],
      ['op', 'OPP'],
      ['opp', 'OPP'],
    ]

    for (const [input, expected] of cases) {
      const rows = makeRows(2)
      setCell(rows, 0, 3, 'PosTeam')
      setCell(rows, 1, 3, 'PlayerOne')
      setCell(rows, 1, 4, input)

      const player = parseTeamsSheet(rows, 1, 18, 4)[0].players[0]

      expect(player.position).toBe(expected)
      expect(player.positionInvalid).toBe(false)
    }
  })

  it('treats a blank position cell as null, not invalid', () => {
    const rows = makeRows(2)
    setCell(rows, 0, 3, 'PosTeam')
    setCell(rows, 1, 3, 'PlayerOne')

    const player = parseTeamsSheet(rows, 1, 18, 4)[0].players[0]

    expect(player.position).toBeNull()
    expect(player.positionInvalid).toBe(false)
  })

  it('flags an unrecognized position value as invalid with null position', () => {
    const rows = makeRows(2)
    setCell(rows, 0, 3, 'PosTeam')
    setCell(rows, 1, 3, 'PlayerOne')
    setCell(rows, 1, 4, 'QB')

    const player = parseTeamsSheet(rows, 1, 18, 4)[0].players[0]

    expect(player.position).toBeNull()
    expect(player.positionInvalid).toBe(true)
  })
})
