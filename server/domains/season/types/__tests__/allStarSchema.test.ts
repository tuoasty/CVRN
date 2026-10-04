import { describe, it, expect } from 'vitest'
import { BatchUpsertSeasonAwardsSchema } from '../schemas'

const seasonId = '11111111-1111-4111-8111-111111111111'
const playerId = '22222222-2222-4222-8222-222222222222'

const parse = (award: Record<string, unknown>) =>
  BatchUpsertSeasonAwardsSchema.safeParse({ seasonId, awards: [{ playerId, awardName: 'Outside', ...award }] }).success

describe('BatchUpsertSeasonAwardsSchema all-star fields', () => {
  it('accepts an all-star with team and slot', () => {
    expect(parse({ category: 'all_star', allStarTeam: 'A', allStarSlot: 'starter' })).toBe(true)
  })

  it('rejects an all-star missing team or slot', () => {
    expect(parse({ category: 'all_star', allStarTeam: 'A' })).toBe(false)
    expect(parse({ category: 'all_star', allStarSlot: 'sub' })).toBe(false)
  })

  it('rejects all-star fields on other categories', () => {
    expect(parse({ category: 'individual_winners', allStarTeam: 'B' })).toBe(false)
    expect(parse({ category: 'individual_winners' })).toBe(true)
  })

  it('rejects team codes other than A and B', () => {
    expect(parse({ category: 'all_star', allStarTeam: 'C', allStarSlot: 'starter' })).toBe(false)
  })
})
