import { vi, describe, it, expect, beforeEach } from 'vitest'
import { Ok, Err } from '@/shared/types/result'
import type { DBClient, DiscordBoosterRow } from '@/shared/types/db'

vi.mock('server-only', () => ({}))
vi.mock('@/server/db/boosters.repo', () => ({
    findAllBoosters: vi.fn(),
    deleteBoostersByDiscordIds: vi.fn(),
    upsertBoosters: vi.fn(),
}))
vi.mock('../../helpers/discordClient', () => ({ listGuildBoosters: vi.fn() }))
vi.mock('../../helpers/bloxlinkClient', () => ({ resolveRobloxIdFromDiscord: vi.fn() }))
vi.mock('@/server/utils/logger', () => {
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
    return { logger: { ...log, child: () => log } }
})

import { findAllBoosters, deleteBoostersByDiscordIds, upsertBoosters } from '@/server/db/boosters.repo'
import { listGuildBoosters } from '../../helpers/discordClient'
import { resolveRobloxIdFromDiscord } from '../../helpers/bloxlinkClient'
import { syncBoosters } from '../syncBoosters'

const supabase = {} as DBClient
const NOW = new Date('2026-11-07T12:00:00.000Z')
const noSleep = () => Promise.resolve()

function row(overrides: Partial<DiscordBoosterRow> = {}): DiscordBoosterRow {
    return {
        discord_user_id: 'd1',
        roblox_user_id: 'r1',
        premium_since: null,
        resolved_at: '2026-11-06T12:00:00.000Z',
        updated_at: '2026-11-06T12:00:00.000Z',
        ...overrides,
    }
}

const integrationError = { message: 'boom', code: 'INTEGRATION_ERROR' as const }

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(deleteBoostersByDiscordIds).mockResolvedValue(Ok(true))
    vi.mocked(upsertBoosters).mockResolvedValue(Ok(true))
})

describe('syncBoosters', () => {
    it('leaves the table untouched when Discord fails', async () => {
        vi.mocked(listGuildBoosters).mockResolvedValue(Err(integrationError))

        const result = await syncBoosters(supabase, { now: NOW, sleep: noSleep })

        expect(result.ok).toBe(false)
        expect(findAllBoosters).not.toHaveBeenCalled()
        expect(deleteBoostersByDiscordIds).not.toHaveBeenCalled()
        expect(upsertBoosters).not.toHaveBeenCalled()
    })

    it('resolves new boosters, records unlinked ones and deletes ex-boosters', async () => {
        vi.mocked(listGuildBoosters).mockResolvedValue(Ok([
            { discordUserId: 'linked', premiumSince: null },
            { discordUserId: 'unlinked', premiumSince: null },
        ]))
        vi.mocked(findAllBoosters).mockResolvedValue(Ok([row({ discord_user_id: 'gone', roblox_user_id: 'r-gone' })]))
        vi.mocked(resolveRobloxIdFromDiscord).mockImplementation(async (id) => Ok(id === 'linked' ? 'r-linked' : null))

        const result = await syncBoosters(supabase, { now: NOW, sleep: noSleep })

        expect(result).toEqual(Ok({
            boosters: 2, added: 2, removed: 1, resolved: 2, unlinked: 1, deferred: 0, changed: true,
        }))
        expect(deleteBoostersByDiscordIds).toHaveBeenCalledWith(supabase, ['gone'])
        expect(vi.mocked(upsertBoosters).mock.calls[0][1]).toEqual([
            expect.objectContaining({ discord_user_id: 'linked', roblox_user_id: 'r-linked', resolved_at: NOW.toISOString() }),
            expect.objectContaining({ discord_user_id: 'unlinked', roblox_user_id: null }),
        ])
    })

    it('stops resolving after a Bloxlink error and defers the rest', async () => {
        vi.mocked(listGuildBoosters).mockResolvedValue(Ok([
            { discordUserId: 'a', premiumSince: null },
            { discordUserId: 'b', premiumSince: null },
            { discordUserId: 'c', premiumSince: null },
        ]))
        vi.mocked(findAllBoosters).mockResolvedValue(Ok([]))
        vi.mocked(resolveRobloxIdFromDiscord)
            .mockResolvedValueOnce(Ok('r-a'))
            .mockResolvedValueOnce(Err(integrationError))

        const result = await syncBoosters(supabase, { now: NOW, sleep: noSleep })

        expect(resolveRobloxIdFromDiscord).toHaveBeenCalledTimes(2)
        expect(result.ok && result.value).toMatchObject({ resolved: 1, deferred: 2, changed: true })
        expect(vi.mocked(upsertBoosters).mock.calls[0][1]).toHaveLength(1)
    })

    it('caps lookups per run at maxResolves', async () => {
        vi.mocked(listGuildBoosters).mockResolvedValue(Ok([
            { discordUserId: 'a', premiumSince: null },
            { discordUserId: 'b', premiumSince: null },
            { discordUserId: 'c', premiumSince: null },
        ]))
        vi.mocked(findAllBoosters).mockResolvedValue(Ok([]))
        vi.mocked(resolveRobloxIdFromDiscord).mockResolvedValue(Ok(null))

        const result = await syncBoosters(supabase, { now: NOW, sleep: noSleep, maxResolves: 2 })

        expect(resolveRobloxIdFromDiscord).toHaveBeenCalledTimes(2)
        expect(result.ok && result.value).toMatchObject({ resolved: 2, deferred: 1, changed: false })
    })

    it('reports no change when every booster is fresh', async () => {
        vi.mocked(listGuildBoosters).mockResolvedValue(Ok([{ discordUserId: 'd1', premiumSince: null }]))
        vi.mocked(findAllBoosters).mockResolvedValue(Ok([row()]))

        const result = await syncBoosters(supabase, { now: NOW, sleep: noSleep })

        expect(resolveRobloxIdFromDiscord).not.toHaveBeenCalled()
        expect(result.ok && result.value).toMatchObject({ resolved: 0, removed: 0, changed: false })
    })
})
