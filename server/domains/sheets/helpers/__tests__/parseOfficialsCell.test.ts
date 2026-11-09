import { describe, it, expect } from 'vitest'
import { parseOfficialsCell } from '../parseOfficialsCell'

describe('parseOfficialsCell', () => {
  it.each(['REF', 'REFS', 'REFEREE', 'REFEREES', 'ref', 'Referees'])('reads referees labelled %s', label => {
    expect(parseOfficialsCell(`${label}: alice / bob`, 'referee')).toEqual(['alice', 'bob'])
  })

  it('allows spaces around the colon', () => {
    expect(parseOfficialsCell('REFEREE :  alice, bob', 'referee')).toEqual(['alice', 'bob'])
  })

  it('reads media', () => {
    expect(parseOfficialsCell('MEDIA: carol', 'media')).toEqual(['carol'])
  })

  it('does not read a media cell as referees', () => {
    expect(parseOfficialsCell('MEDIA: carol', 'referee')).toEqual([])
  })

  it('does not read a referee cell as media', () => {
    expect(parseOfficialsCell('REF: alice', 'media')).toEqual([])
  })

  it('does not treat a word starting with REF as a label', () => {
    expect(parseOfficialsCell('REFRESH: alice', 'referee')).toEqual([])
  })

  it('returns nothing for an empty cell', () => {
    expect(parseOfficialsCell('   ', 'referee')).toEqual([])
    expect(parseOfficialsCell(undefined, 'media')).toEqual([])
  })

  it('returns nothing for a label with no names', () => {
    expect(parseOfficialsCell('REFS:', 'referee')).toEqual([])
  })
})
