import { describe, it, expect } from 'vitest'
import { parseMatchSet } from '../parseMatchSet'

const STAT_COLS = [
  'Ape Kills', 'Ape Attempts', 'Delay Kills', 'Quick Kills', 'Wipes/Tools',
  'Total Attempts', 'Spiking Errors', 'Assist', 'Setting Errors', 'Kill Blocks',
  'Block Touches', 'Serve Receives', 'Digs', 'Block Follows', 'Dives', 'Aces',
  'Service Errors', 'Misc Errors',
]

const HEADER = ['Players', ...STAT_COLS]

const player = (name: string) => [name, ...STAT_COLS.map((_, i) => String(i))]

const label = (name: string) => [name, ...STAT_COLS.map(() => '')]

const BLANK: string[] = []

const usernames = (s: { lines: { username: string }[] }) => s.lines.map(l => l.username)

describe('parseMatchSet — blank rows', () => {
  it('does not split a team when a blank row sits between two players', () => {
    const { sections, errors } = parseMatchSet([
      HEADER,
      label('Bhaskara Bandits'),
      player('kevin'),
      BLANK,
      player('zacky'),
    ], 1)

    expect(errors).toHaveLength(0)
    expect(sections).toHaveLength(1)
    expect(usernames(sections[0])).toEqual(['kevin', 'zacky'])
  })

  it('splits on the next header even with a blank row before it', () => {
    const { sections, errors } = parseMatchSet([
      HEADER,
      label('Bhaskara Bandits'),
      player('kevin'),
      BLANK,
      label('Garuda'),
      player('budi'),
    ], 1)

    expect(errors).toHaveLength(0)
    expect(sections).toHaveLength(2)
    expect(sections[0].headerLabel).toBe('Bhaskara Bandits')
    expect(usernames(sections[0])).toEqual(['kevin'])
    expect(sections[1].headerLabel).toBe('Garuda')
    expect(usernames(sections[1])).toEqual(['budi'])
  })

  it('ignores leading and trailing blank rows', () => {
    const { sections, errors } = parseMatchSet([
      HEADER,
      BLANK,
      label('Garuda'),
      player('budi'),
      BLANK,
      BLANK,
    ], 1)

    expect(errors).toHaveLength(0)
    expect(sections).toHaveLength(1)
    expect(usernames(sections[0])).toEqual(['budi'])
  })
})

describe('parseMatchSet — section boundaries', () => {
  it('treats an unrecognized header as a section; naming is not the parser\'s job', () => {
    const { sections, errors } = parseMatchSet([
      HEADER,
      label('Bhaskara Bandits'),
      player('kevin'),
      label('Grdaruga Garuda'),
      player('budi'),
    ], 1)

    expect(errors).toHaveLength(0)
    expect(sections).toHaveLength(2)
    expect(sections[1].headerLabel).toBe('Grdaruga Garuda')
    expect(usernames(sections[1])).toEqual(['budi'])
  })

  it('stops parsing at Team Totals', () => {
    const { sections, errors } = parseMatchSet([
      HEADER,
      label('Garuda'),
      player('budi'),
      player('Team Totals'),
      player('stray'),
    ], 1)

    expect(errors).toHaveLength(0)
    expect(sections).toHaveLength(1)
    expect(usernames(sections[0])).toEqual(['budi'])
  })

  it('ignores the per-team totals block below Team Totals', () => {
    const { sections, errors } = parseMatchSet([
      HEADER,
      label('HOPE'),
      player('kevin'),
      label('UCLA'),
      player('budi'),
      label('Team Totals'),
      player('HOPE'),
      player('UCLA'),
    ], 1)

    expect(errors).toHaveLength(0)
    expect(sections).toHaveLength(2)
    expect(usernames(sections[0])).toEqual(['kevin'])
    expect(usernames(sections[1])).toEqual(['budi'])
  })

  it('keeps the section open across a "score:" row', () => {
    const { sections, errors } = parseMatchSet([
      HEADER,
      label('Garuda'),
      player('budi'),
      player('Score:'),
      player('rafi'),
    ], 1)

    expect(errors).toHaveLength(0)
    expect(sections).toHaveLength(1)
    expect(usernames(sections[0])).toEqual(['budi', 'rafi'])
  })

  it('skips unfilled roster placeholders with or without a space', () => {
    const { sections, errors } = parseMatchSet([
      HEADER,
      label('Garuda'),
      player('budi'),
      player('Player 7'),
      player('PLAYER8'),
      player('player18'),
    ], 1)

    expect(errors).toHaveLength(0)
    expect(sections).toHaveLength(1)
    expect(usernames(sections[0])).toEqual(['budi'])
  })

  it('reads a player row with no stat values as a header (known trade-off)', () => {
    const { sections } = parseMatchSet([
      HEADER,
      label('Garuda'),
      player('budi'),
      label('benchwarmer'),
    ], 1)

    expect(sections).toHaveLength(2)
    expect(sections[1].headerLabel).toBe('benchwarmer')
    expect(sections[1].lines).toHaveLength(0)
  })

  it('errors when a player row precedes any header', () => {
    const { sections, errors } = parseMatchSet([
      HEADER,
      player('kevin'),
    ], 1)

    expect(sections).toHaveLength(0)
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('appeared before any team section')
  })
})

describe('parseMatchSet — header map failures', () => {
  it('errors fatally when no stat header row exists', () => {
    const { sections, errors } = parseMatchSet([['foo'], ['bar']], 1)

    expect(sections).toHaveLength(0)
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe('No stat header row found in tab')
    expect(errors[0].kind).toBe('fatal')
  })

  it('errors fatally when stat columns are missing', () => {
    const { sections, errors } = parseMatchSet([
      ['Players', 'Ape Kills', 'Digs'],
      ['kevin', '1', '2'],
    ], 1)

    expect(sections).toHaveLength(0)
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('Missing stat columns')
    expect(errors[0].kind).toBe('fatal')
  })
})

describe('parseMatchSet — stat lines', () => {
  it('carries setNumber, rowNumber and parsed counts', () => {
    const { sections } = parseMatchSet([
      HEADER,
      label('Garuda'),
      player('budi'),
    ], 3)

    const line = sections[0].lines[0]
    expect(line.setNumber).toBe(3)
    expect(line.rowNumber).toBe(3)
    expect(line.counts.ape_kills).toBe(0)
    expect(line.counts.ape_attempts).toBe(1)
    expect(line.counts.misc_errors).toBe(17)
  })
})

describe('parseMatchSet — retired Aces column', () => {
  const NO_ACES = STAT_COLS.filter(c => c !== 'Aces')
  const HEADER_NO_ACES = ['Players', ...NO_ACES]
  const playerNoAces = (name: string) => [name, ...NO_ACES.map((_, i) => String(i))]

  it('syncs a sheet with no Aces column, defaulting aces to 0', () => {
    const { sections, errors } = parseMatchSet([
      HEADER_NO_ACES,
      ['Garuda', ...NO_ACES.map(() => '')],
      playerNoAces('budi'),
    ], 1)

    expect(errors).toHaveLength(0)
    expect(sections[0].lines[0].counts.aces).toBe(0)
  })
})

describe('parseMatchSet — POS column', () => {
  const HEADER_POS = ['Players', 'POS', ...STAT_COLS]
  const playerPos = (name: string, pos: string) =>
    [name, pos, ...STAT_COLS.map((_, i) => String(i))]
  const labelPos = (name: string) => [name, '', ...STAT_COLS.map(() => '')]

  it('reads the normalized position from the column beside PLAYERS', () => {
    const { sections, errors } = parseMatchSet([
      HEADER_POS,
      labelPos('Garuda'),
      playerPos('budi', 'OH'),
      playerPos('rafi', 'S'),
    ], 1)

    expect(errors).toHaveLength(0)
    expect(sections[0].lines[0].position).toBe('OH')
    expect(sections[0].lines[1].position).toBe('SET')
  })

  it('leaves position null when the POS cell is blank or unrecognized', () => {
    const { sections } = parseMatchSet([
      HEADER_POS,
      labelPos('Garuda'),
      playerPos('budi', ''),
      playerPos('rafi', 'xyz'),
    ], 1)

    expect(sections[0].lines[0].position).toBeNull()
    expect(sections[0].lines[1].position).toBeNull()
  })
})
