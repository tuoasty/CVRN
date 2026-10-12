import { describe, it, expect } from 'vitest'
import { getSeasonStatus } from '../getSeasonStatus'

const now = new Date('2026-10-12T12:00:00Z')

describe('getSeasonStatus', () => {
  it('is active when started with no end date', () => {
    expect(getSeasonStatus({ start_date: '2026-09-01T00:00:00+00:00', end_date: null }, now)).toBe('active')
  })

  it('is active when the end date is set but still in the future', () => {
    expect(getSeasonStatus({ start_date: '2026-09-01T00:00:00+00:00', end_date: '2026-10-20T00:00:00+00:00' }, now)).toBe('active')
  })

  it('is ended once the end date has passed', () => {
    expect(getSeasonStatus({ start_date: '2026-08-01T00:00:00+00:00', end_date: '2026-10-01T00:00:00+00:00' }, now)).toBe('ended')
  })

  it('is ended exactly at the end date', () => {
    expect(getSeasonStatus({ start_date: '2026-08-01T00:00:00+00:00', end_date: '2026-10-12T12:00:00+00:00' }, now)).toBe('ended')
  })

  it('is upcoming before the start date', () => {
    expect(getSeasonStatus({ start_date: '2026-11-01T00:00:00+00:00', end_date: null }, now)).toBe('upcoming')
  })
})
