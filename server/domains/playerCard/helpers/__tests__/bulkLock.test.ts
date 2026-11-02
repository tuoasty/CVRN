import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Err, Ok } from '@/shared/types/result'
import type { DBClient } from '@/shared/types/db'
import { assertNoRunningBulk } from '../bulkLock'

const mocks = vi.hoisted(() => ({
    findRunningCardBulkJob: vi.fn(),
    findCardTemplateById: vi.fn(),
}))

vi.mock('@/server/db/cardBulkJobs.repo', () => ({ findRunningCardBulkJob: mocks.findRunningCardBulkJob }))
vi.mock('@/server/db/playerCards.repo', () => ({ findCardTemplateById: mocks.findCardTemplateById }))

const client = {} as DBClient
const message = 'A bulk generation is running. Wait for it to finish or stop it.'

describe('assertNoRunningBulk', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mocks.findRunningCardBulkJob.mockResolvedValue(Ok({ id: 'j', group_id: 'running' }))
    })

    it('passes with no running job', async () => {
        mocks.findRunningCardBulkJob.mockResolvedValue(Ok(null))
        expect(await assertNoRunningBulk(client)).toEqual(Ok(null))
        expect(await assertNoRunningBulk(client, { groupId: 'running' })).toEqual(Ok(null))
        expect(mocks.findCardTemplateById).not.toHaveBeenCalled()
    })

    it('blocks any scope-free call while running', async () => {
        const result = await assertNoRunningBulk(client)
        expect(!result.ok && result.error).toEqual({ message, code: 'CONFLICT' })
    })

    it('blocks only the running group', async () => {
        expect(await assertNoRunningBulk(client, { groupId: 'other' })).toEqual(Ok(null))
        const result = await assertNoRunningBulk(client, { groupId: 'running' })
        expect(!result.ok && result.error).toEqual({ message, code: 'CONFLICT' })
    })

    it('resolves a tier to its group', async () => {
        mocks.findCardTemplateById.mockResolvedValue(Ok({ id: 't', group_id: 'running' }))
        const blocked = await assertNoRunningBulk(client, { templateId: 't' })
        expect(!blocked.ok && blocked.error.code).toBe('CONFLICT')

        mocks.findCardTemplateById.mockResolvedValue(Ok({ id: 't', group_id: 'other' }))
        expect(await assertNoRunningBulk(client, { templateId: 't' })).toEqual(Ok(null))
    })

    it('leaves an unknown tier for the command to report', async () => {
        mocks.findCardTemplateById.mockResolvedValue(Ok(null))
        expect(await assertNoRunningBulk(client, { templateId: 't' })).toEqual(Ok(null))
    })

    it('fails closed when the lock cannot be read', async () => {
        const failed = Err({ message: 'db down', code: 'DB_ERROR' as const })
        mocks.findRunningCardBulkJob.mockResolvedValue(failed)
        expect(await assertNoRunningBulk(client)).toEqual(failed)
    })

    it('fails closed when the tier cannot be read', async () => {
        const failed = Err({ message: 'db down', code: 'DB_ERROR' as const })
        mocks.findCardTemplateById.mockResolvedValue(failed)
        expect(await assertNoRunningBulk(client, { templateId: 't' })).toEqual(failed)
    })
})
