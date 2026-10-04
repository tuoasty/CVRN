import { describe, it, expect } from 'vitest'
import { buildPlayerAwardList } from '../playerAwardList'
import type { PlayerAward, PlayerSpecEntry } from '@/server/domains/player'

const base = {
  season_name: '', season_slug: '', region_code: 'NA',
  team_name: null, team_slug: null, team_disbanded: false,
  awarded_at: null, team_logo_url: null, team_logo_bg_removed: false,
}

function award(id: string, seasonStart: string, category: string, extra: Partial<PlayerAward> = {}): PlayerAward {
  return { ...base, id, award_name: id, category, season_id: seasonStart, season_start_date: seasonStart, ...extra }
}

function spec(id: string, seasonStart: string): PlayerSpecEntry {
  return {
    ...base, id, spec_name: id, position: 'OH', stars: 3, stars_awarded: 3, dropped: false,
    season_id: seasonStart, season_start_date: seasonStart,
  }
}

const ids = (items: ReturnType<typeof buildPlayerAwardList>) =>
  items.map(i => (i.kind === 'award' ? i.award.id : i.spec.id))

describe('buildPlayerAwardList', () => {
  it('interleaves specs with awards by season start, newest first', () => {
    const list = buildPlayerAwardList(
      [award('s1-mvp', '2026-01-01', 'individual_winners'), award('s3-mvp', '2026-09-01', 'individual_winners')],
      [spec('s2-spec', '2026-05-01'), spec('s1-spec', '2026-01-01')],
    )
    expect(ids(list)).toEqual(['s3-mvp', 's2-spec', 's1-mvp', 's1-spec'])
  })

  it('orders categories within a season: individual, all-star, first team, spec', () => {
    const list = buildPlayerAwardList(
      [
        award('first', '2026-01-01', 'first_team'),
        award('allstar', '2026-01-01', 'all_star', { all_star_team: 'A', all_star_slot: 'starter' }),
        award('mvp', '2026-01-01', 'individual_winners'),
      ],
      [spec('spec', '2026-01-01')],
    )
    expect(ids(list)).toEqual(['mvp', 'allstar', 'first', 'spec'])
  })

  it('uses admin sort_order within the same category', () => {
    const list = buildPlayerAwardList(
      [
        award('b', '2026-01-01', 'individual_winners', { sort_order: 5 }),
        award('a', '2026-01-01', 'individual_winners', { sort_order: 1 }),
      ],
      [],
    )
    expect(ids(list)).toEqual(['a', 'b'])
  })
})
