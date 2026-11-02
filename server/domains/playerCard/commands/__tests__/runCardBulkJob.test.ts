import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Err, Ok } from '@/shared/types/result'
import type { DBClient } from '@/shared/types/db'
import type { OverallConfig, OverallInputRow } from '@/server/domains/overall/types'
import { BULK_PAUSE_MS, runCardBulkJob } from '../runCardBulkJob'

const mocks = vi.hoisted(() => ({
    renderAndSaveCard: vi.fn(),
    buildCardData: vi.fn(),
    findCardBulkJobById: vi.fn(),
    updateCardBulkJob: vi.fn(),
}))

vi.mock('../../helpers/renderAndSaveCard', () => ({ renderAndSaveCard: mocks.renderAndSaveCard }))
vi.mock('../../helpers/buildCardData', () => ({ buildCardData: mocks.buildCardData }))
vi.mock('@/server/db/cardBulkJobs.repo', () => ({
    findCardBulkJobById: mocks.findCardBulkJobById,
    updateCardBulkJob: mocks.updateCardBulkJob,
}))

const admin = {} as DBClient
const card = { playerId: 'p' }
const sleep = vi.fn(async () => {})
const running = { status: 'running', stop_requested: false }
const failure = Err({ message: 'Roblox headshot unavailable', code: 'INTEGRATION_ERROR' as const })

const players = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ playerId: `p${i}`, username: `user${i}` }) as OverallInputRow)

const input = (count: number) => ({
    jobId: 'j',
    seasonNumber: 3,
    groupId: 'g',
    players: players(count),
    config: {} as OverallConfig,
    startedBy: 'u',
    sleep,
})

const lastPatch = () => mocks.updateCardBulkJob.mock.calls.at(-1)?.[2]

describe('runCardBulkJob', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        sleep.mockImplementation(async () => {})
        mocks.renderAndSaveCard.mockResolvedValue(Ok(card))
        mocks.buildCardData.mockReturnValue({ ovr: 80 })
        mocks.findCardBulkJobById.mockResolvedValue(Ok(running))
        mocks.updateCardBulkJob.mockResolvedValue(Ok(null))
    })

    it('never renders two cards at once', async () => {
        let active = 0
        let peak = 0
        mocks.renderAndSaveCard.mockImplementation(async () => {
            peak = Math.max(peak, ++active)
            await Promise.resolve()
            active--
            return Ok(card)
        })
        await runCardBulkJob(admin, input(3))
        expect(peak).toBe(1)
        expect(mocks.renderAndSaveCard).toHaveBeenCalledTimes(3)
    })

    it('passes strict images and the starter', async () => {
        await runCardBulkJob(admin, input(1))
        expect(mocks.renderAndSaveCard.mock.calls[0][1]).toMatchObject({ strictImages: true, generatedBy: 'u', seasonNumber: 3, groupId: 'g' })
    })

    it('saves under the player it renders', async () => {
        await runCardBulkJob(admin, input(1))
        const ensured = await mocks.renderAndSaveCard.mock.calls[0][1].ensurePlayerId()
        expect(ensured).toEqual(Ok('p0'))
    })

    it('shows the current player and a fresh heartbeat before rendering', async () => {
        await runCardBulkJob(admin, input(1))
        const first = mocks.updateCardBulkJob.mock.calls[0][2]
        expect(first.current_username).toBe('user0')
        expect(first.heartbeat_at).toEqual(expect.any(String))
        expect(mocks.updateCardBulkJob.mock.invocationCallOrder[0]).toBeLessThan(mocks.renderAndSaveCard.mock.invocationCallOrder[0])
    })

    it('completes with done equal to total', async () => {
        await runCardBulkJob(admin, input(3))
        expect(lastPatch()).toMatchObject({ status: 'completed', done: 3, failed: 0, current_username: null, finished_at: expect.any(String) })
    })

    it('pauses between cards but not after the last', async () => {
        await runCardBulkJob(admin, input(3))
        expect(sleep).toHaveBeenCalledTimes(2)
        expect(sleep).toHaveBeenCalledWith(BULK_PAUSE_MS)
        expect(BULK_PAUSE_MS).toBe(1500)
    })

    it('continues past a failure and records it', async () => {
        mocks.renderAndSaveCard.mockResolvedValueOnce(failure)
        await runCardBulkJob(admin, input(3))
        expect(mocks.renderAndSaveCard).toHaveBeenCalledTimes(3)
        expect(lastPatch()).toMatchObject({
            status: 'completed',
            done: 3,
            failed: 1,
            failures: [{ playerId: 'p0', username: 'user0', message: 'Roblox headshot unavailable' }],
        })
    })

    it('counts a thrown exception as that card failing', async () => {
        mocks.renderAndSaveCard.mockRejectedValueOnce(new Error('satori blew up'))
        await expect(runCardBulkJob(admin, input(2))).resolves.toBeUndefined()
        expect(lastPatch()).toMatchObject({
            status: 'completed',
            done: 2,
            failed: 1,
            failures: [{ playerId: 'p0', username: 'user0', message: 'satori blew up' }],
        })
    })

    it('counts a failure building the card data as that card failing', async () => {
        mocks.buildCardData.mockImplementationOnce(() => {
            throw new Error('bad ranks')
        })
        await runCardBulkJob(admin, input(2))
        expect(mocks.renderAndSaveCard).toHaveBeenCalledTimes(1)
        expect(lastPatch()).toMatchObject({ status: 'completed', done: 2, failed: 1 })
    })

    it('stops after 10 failures in a row with a reason', async () => {
        mocks.renderAndSaveCard.mockResolvedValue(failure)
        await runCardBulkJob(admin, input(15))
        expect(mocks.renderAndSaveCard).toHaveBeenCalledTimes(10)
        expect(lastPatch()).toMatchObject({
            status: 'stopped',
            done: 10,
            failed: 10,
            stop_reason: 'Stopped after 10 failures in a row',
            current_username: null,
            finished_at: expect.any(String),
        })
    })

    it('resets the failure streak on success', async () => {
        for (let i = 0; i < 9; i++) mocks.renderAndSaveCard.mockResolvedValueOnce(failure)
        mocks.renderAndSaveCard.mockResolvedValueOnce(Ok(card))
        for (let i = 0; i < 9; i++) mocks.renderAndSaveCard.mockResolvedValueOnce(failure)
        await runCardBulkJob(admin, input(19))
        expect(mocks.renderAndSaveCard).toHaveBeenCalledTimes(19)
        expect(lastPatch()).toMatchObject({ status: 'completed', done: 19, failed: 18 })
    })

    it('honors a stop request, keeping cards made', async () => {
        mocks.findCardBulkJobById
            .mockResolvedValueOnce(Ok(running))
            .mockResolvedValue(Ok({ status: 'running', stop_requested: true }))
        await runCardBulkJob(admin, input(3))
        expect(mocks.renderAndSaveCard).toHaveBeenCalledTimes(1)
        const patch = lastPatch()
        expect(patch).toMatchObject({ status: 'stopped', done: 1, current_username: null, finished_at: expect.any(String) })
        expect(patch.stop_reason ?? null).toBeNull()
    })

    it('ends completed when stop arrives during the last card', async () => {
        mocks.renderAndSaveCard.mockImplementation(async () => {
            mocks.findCardBulkJobById.mockResolvedValue(Ok({ status: 'running', stop_requested: true }))
            return Ok(card)
        })
        await runCardBulkJob(admin, input(1))
        expect(lastPatch()).toMatchObject({ status: 'completed', done: 1 })
    })

    it('exits without writing when the job is no longer running', async () => {
        mocks.findCardBulkJobById.mockResolvedValue(Ok({ status: 'interrupted', stop_requested: false }))
        await runCardBulkJob(admin, input(3))
        expect(mocks.renderAndSaveCard).not.toHaveBeenCalled()
        expect(mocks.updateCardBulkJob).not.toHaveBeenCalled()
    })

    it('exits without writing when the job row is gone', async () => {
        mocks.findCardBulkJobById.mockResolvedValue(Ok(null))
        await runCardBulkJob(admin, input(3))
        expect(mocks.renderAndSaveCard).not.toHaveBeenCalled()
        expect(mocks.updateCardBulkJob).not.toHaveBeenCalled()
    })

    it('carries on when a progress write fails', async () => {
        mocks.updateCardBulkJob.mockResolvedValueOnce(Err({ message: 'db down', code: 'DB_ERROR' }))
        await runCardBulkJob(admin, input(3))
        expect(mocks.renderAndSaveCard).toHaveBeenCalledTimes(3)
    })

    it('carries on when reading the job fails', async () => {
        mocks.findCardBulkJobById.mockResolvedValueOnce(Err({ message: 'db down', code: 'DB_ERROR' }))
        await runCardBulkJob(admin, input(2))
        expect(mocks.renderAndSaveCard).toHaveBeenCalledTimes(2)
    })

    it('does not reject when a thrown error escapes a repo call', async () => {
        mocks.updateCardBulkJob.mockRejectedValue(new Error('socket closed'))
        await expect(runCardBulkJob(admin, input(2))).resolves.toBeUndefined()
        expect(mocks.renderAndSaveCard).toHaveBeenCalledTimes(2)
    })
})
