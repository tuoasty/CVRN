import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Err, Ok } from '@/shared/types/result'
import type { DBClient } from '@/shared/types/db'
import type { OverallInputRow } from '@/server/domains/overall/types'
import { startCardBulkJob } from '../startCardBulkJob'
import { BULK_STALE_MS } from '../../helpers/bulkLock'
import { stopCardBulkJob } from '../stopCardBulkJob'
import { getCardBulkStatus } from '../../queries/getCardBulkStatus'

const mocks = vi.hoisted(() => ({
    expireStaleCardBulkJobs: vi.fn(),
    insertCardBulkJob: vi.fn(),
    findLatestCardBulkJob: vi.fn(),
    requestCardBulkStop: vi.fn(),
    findPlayerIdsWithCards: vi.fn(),
    getCardCatalog: vi.fn(),
    getOverallConfig: vi.fn(),
    runInBackground: vi.fn(),
    runCardBulkJob: vi.fn(),
}))

vi.mock('@/server/db/cardBulkJobs.repo', () => ({
    expireStaleCardBulkJobs: mocks.expireStaleCardBulkJobs,
    insertCardBulkJob: mocks.insertCardBulkJob,
    findLatestCardBulkJob: mocks.findLatestCardBulkJob,
    requestCardBulkStop: mocks.requestCardBulkStop,
}))
vi.mock('@/server/db/playerCards.repo', () => ({ findPlayerIdsWithCards: mocks.findPlayerIdsWithCards }))
vi.mock('../../queries/getCardCatalog', () => ({ getCardCatalog: mocks.getCardCatalog }))
vi.mock('@/server/domains/overall', () => ({ getOverallConfig: mocks.getOverallConfig }))
vi.mock('@/server/utils/runInBackground', () => ({ runInBackground: mocks.runInBackground }))
vi.mock('../runCardBulkJob', () => ({ runCardBulkJob: mocks.runCardBulkJob }))
vi.mock('../../helpers/buildCardData', () => ({ buildCardData: () => ({ ovr: 80 }) }))

const admin = {} as DBClient
const NOW = new Date('2026-11-02T12:00:00.000Z')
const group = {
    id: 'g',
    name: 'Base',
    isActive: true,
    layers: [{ kind: 'art', src: 'bg.png', x: 0, y: 0, w: 1, h: 1 }],
    templates: [{ id: 't', name: 'Gold', minOvr: 1, art: [{ name: 'bg.png' }] }],
}
const config = { scalings: {}, savedPositions: [], overrides: {} }
const player = (playerId: string, regionCode = 'AS') => ({ playerId, username: playerId, regionCode }) as OverallInputRow
const rows = [player('a'), player('b'), player('c'), player('z', 'EU')]
const input = (patch = {}) => ({ seasonNumber: 3, regionCode: 'AS', groupId: 'g', mode: 'all' as const, rows, startedBy: 'u', ...patch })
const jobRow = (patch = {}) => ({ id: 'j', season_number: 3, region_code: 'AS', group_id: 'g', mode: 'all', status: 'running', stop_requested: false, stop_reason: null, total: 3, done: 0, failed: 0, failures: [], current_username: null, started_at: 's', finished_at: null, ...patch })

beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers({ now: NOW })
    mocks.expireStaleCardBulkJobs.mockResolvedValue(Ok(null))
    mocks.getCardCatalog.mockResolvedValue(Ok([group]))
    mocks.getOverallConfig.mockResolvedValue(Ok(config))
    mocks.findPlayerIdsWithCards.mockResolvedValue(Ok(['a']))
    mocks.insertCardBulkJob.mockImplementation(async (_client, row) => Ok(jobRow({ total: row.total, mode: row.mode })))
    mocks.requestCardBulkStop.mockResolvedValue(Ok(null))
})

afterEach(() => {
    vi.useRealTimers()
})

describe('startCardBulkJob', () => {
    it('expires stale jobs before anything else', async () => {
        await startCardBulkJob(admin, input())
        const cutoff = new Date(NOW.getTime() - BULK_STALE_MS).toISOString()
        expect(mocks.expireStaleCardBulkJobs).toHaveBeenCalledWith(admin, cutoff, NOW.toISOString())
        expect(mocks.expireStaleCardBulkJobs.mock.invocationCallOrder[0]).toBeLessThan(mocks.getCardCatalog.mock.invocationCallOrder[0])
        expect(mocks.expireStaleCardBulkJobs.mock.invocationCallOrder[0]).toBeLessThan(mocks.insertCardBulkJob.mock.invocationCallOrder[0])
    })

    it('stale means five minutes', () => {
        expect(BULK_STALE_MS).toBe(5 * 60 * 1000)
    })

    it('returns CONFLICT when a run is active, and starts no worker', async () => {
        const conflict = Err({ message: 'A bulk generation is already running', code: 'CONFLICT' as const })
        mocks.insertCardBulkJob.mockResolvedValue(conflict)
        expect(await startCardBulkJob(admin, input())).toEqual(conflict)
        expect(mocks.runInBackground).not.toHaveBeenCalled()
    })

    it('rejects with the start problem and inserts nothing', async () => {
        const result = await startCardBulkJob(admin, input({ regionCode: 'SA' }))
        expect(!result.ok && result.error).toMatchObject({ message: 'No players to generate', code: 'VALIDATION_ERROR' })
        expect(mocks.insertCardBulkJob).not.toHaveBeenCalled()
        expect(mocks.runInBackground).not.toHaveBeenCalled()
    })

    it('missing mode removes players with cards and sets total', async () => {
        const result = await startCardBulkJob(admin, input({ mode: 'missing' }))
        expect(mocks.findPlayerIdsWithCards).toHaveBeenCalledWith(admin, { seasonNumber: 3, groupId: 'g' })
        expect(mocks.insertCardBulkJob.mock.calls[0][1]).toMatchObject({ mode: 'missing', total: 2, season_number: 3, region_code: 'AS', group_id: 'g', started_by: 'u' })
        expect(result.ok && result.value.total).toBe(2)
    })

    it('all mode includes players with cards', async () => {
        await startCardBulkJob(admin, input())
        expect(mocks.findPlayerIdsWithCards).not.toHaveBeenCalled()
        expect(mocks.insertCardBulkJob.mock.calls[0][1]).toMatchObject({ mode: 'all', total: 3 })
    })

    it('stores the region upper-cased', async () => {
        await startCardBulkJob(admin, input({ regionCode: 'as' }))
        expect(mocks.insertCardBulkJob.mock.calls[0][1]).toMatchObject({ region_code: 'AS', total: 3 })
    })

    it('hands the worker to schedule instead of running it in the background', async () => {
        const schedule = vi.fn()
        await startCardBulkJob(admin, input({ schedule }))
        expect(schedule).toHaveBeenCalledOnce()
        expect(mocks.runInBackground).not.toHaveBeenCalled()
        expect(mocks.runCardBulkJob).not.toHaveBeenCalled()
        await schedule.mock.calls[0][0]()
        expect(mocks.runCardBulkJob.mock.calls[0][1]).toMatchObject({ jobId: 'j' })
    })

    it('starts the worker once with the captured players and config', async () => {
        await startCardBulkJob(admin, input())
        expect(mocks.runInBackground).toHaveBeenCalledOnce()
        expect(mocks.runCardBulkJob).not.toHaveBeenCalled()
        await mocks.runInBackground.mock.calls[0][0]()
        const [client, args] = mocks.runCardBulkJob.mock.calls[0]
        expect(client).toBe(admin)
        expect(args).toMatchObject({ jobId: 'j', seasonNumber: 3, groupId: 'g', config, startedBy: 'u' })
        expect(args.players.map((row: OverallInputRow) => row.playerId)).toEqual(['a', 'b', 'c'])
    })

    it('returns the catalog error instead of starting', async () => {
        const failed = Err({ message: 'db down', code: 'DB_ERROR' as const })
        mocks.getCardCatalog.mockResolvedValue(failed)
        expect(await startCardBulkJob(admin, input())).toEqual(failed)
        expect(mocks.insertCardBulkJob).not.toHaveBeenCalled()
    })
})

describe('getCardBulkStatus', () => {
    it('expires stale jobs, then returns the latest', async () => {
        mocks.findLatestCardBulkJob.mockResolvedValue(Ok(jobRow({ status: 'interrupted' })))
        const result = await getCardBulkStatus(admin)
        expect(mocks.expireStaleCardBulkJobs.mock.invocationCallOrder[0]).toBeLessThan(mocks.findLatestCardBulkJob.mock.invocationCallOrder[0])
        expect(result.ok && result.value?.status).toBe('interrupted')
    })

    it('returns null with no jobs', async () => {
        mocks.findLatestCardBulkJob.mockResolvedValue(Ok(null))
        expect(await getCardBulkStatus(admin)).toEqual(Ok(null))
    })
})

describe('stopCardBulkJob', () => {
    it('is a harmless no-op for a finished job', async () => {
        expect(await stopCardBulkJob(admin, 'j')).toEqual(Ok(null))
        expect(mocks.requestCardBulkStop).toHaveBeenCalledWith(admin, 'j')
    })
})
