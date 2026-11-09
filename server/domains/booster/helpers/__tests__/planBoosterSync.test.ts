import { describe, expect, it } from 'vitest'
import type { DiscordBoosterRow } from '@/shared/types/db'
import { planBoosterSync, RESOLVE_STALE_MS } from '../planBoosterSync'

const NOW = new Date('2026-11-07T12:00:00.000Z')
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString()

function row(overrides: Partial<DiscordBoosterRow> = {}): DiscordBoosterRow {
    return {
        discord_user_id: 'd1',
        roblox_user_id: 'r1',
        premium_since: '2026-09-14T10:22:00+00:00',
        resolved_at: daysAgo(1),
        updated_at: daysAgo(1),
        ...overrides,
    }
}

describe('planBoosterSync', () => {
    it('resolves every booster on an empty table', () => {
        const plan = planBoosterSync(
            [{ discordUserId: 'd1', premiumSince: null }, { discordUserId: 'd2', premiumSince: null }],
            [],
            NOW,
        )
        expect(plan.toResolve.map((b) => b.discordUserId)).toEqual(['d1', 'd2'])
        expect(plan.toDelete).toEqual([])
        expect(plan.toRefreshSince).toEqual([])
    })

    it('deletes rows for members who stopped boosting', () => {
        const plan = planBoosterSync([], [row({ discord_user_id: 'gone' })], NOW)
        expect(plan.toDelete).toEqual(['gone'])
        expect(plan.toResolve).toEqual([])
    })

    it('keeps a fresh row without resolving it again', () => {
        const plan = planBoosterSync(
            [{ discordUserId: 'd1', premiumSince: '2026-09-14T10:22:00.000000+00:00' }],
            [row()],
            NOW,
        )
        expect(plan.toResolve).toEqual([])
        expect(plan.toRefreshSince).toEqual([])
    })

    it('re-resolves a row older than the stale window', () => {
        const plan = planBoosterSync(
            [{ discordUserId: 'd1', premiumSince: null }],
            [row({ resolved_at: new Date(NOW.getTime() - RESOLVE_STALE_MS - 1).toISOString(), premium_since: null })],
            NOW,
        )
        expect(plan.toResolve.map((b) => b.discordUserId)).toEqual(['d1'])
    })

    it('resolves a row that was never resolved', () => {
        const plan = planBoosterSync([{ discordUserId: 'd1', premiumSince: null }], [row({ resolved_at: null })], NOW)
        expect(plan.toResolve.map((b) => b.discordUserId)).toEqual(['d1'])
    })

    it('puts new boosters ahead of stale ones, oldest stale first', () => {
        const plan = planBoosterSync(
            [
                { discordUserId: 'stale-recent', premiumSince: null },
                { discordUserId: 'stale-oldest', premiumSince: null },
                { discordUserId: 'new', premiumSince: null },
            ],
            [
                row({ discord_user_id: 'stale-recent', resolved_at: daysAgo(8), premium_since: null }),
                row({ discord_user_id: 'stale-oldest', resolved_at: daysAgo(20), premium_since: null }),
            ],
            NOW,
        )
        expect(plan.toResolve.map((b) => b.discordUserId)).toEqual(['new', 'stale-oldest', 'stale-recent'])
    })

    it('refreshes premium_since on a fresh row when the boost date changed', () => {
        const plan = planBoosterSync(
            [{ discordUserId: 'd1', premiumSince: '2026-11-01T00:00:00+00:00' }],
            [row()],
            NOW,
        )
        expect(plan.toResolve).toEqual([])
        expect(plan.toRefreshSince.map((b) => b.discordUserId)).toEqual(['d1'])
    })
})
