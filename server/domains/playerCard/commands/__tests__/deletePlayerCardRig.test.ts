import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Ok } from '@/shared/types/result'
import type { DBClient } from '@/shared/types/db'
import { deletePlayerCardRig } from '../deletePlayerCardRig'

const mocks = vi.hoisted(() => ({
    deletePlayerCardOverlay: vi.fn(),
    remove: vi.fn(),
}))

vi.mock('@/server/db/playerCards.repo', () => ({ deletePlayerCardOverlay: mocks.deletePlayerCardOverlay }))
vi.mock('@/server/supabase/admin', () => ({
    getSupabaseAdmin: () => ({ storage: { from: () => ({ remove: mocks.remove }) } }),
}))

const supabase = {} as DBClient
const key = { playerId: 'p', seasonNumber: 3, groupId: 'g' }

describe('deletePlayerCardRig', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mocks.deletePlayerCardOverlay.mockResolvedValue(Ok({ image_path: 'rig.png' }))
        mocks.remove.mockResolvedValue({ error: null })
    })

    it('deletes the rig slot for that key', async () => {
        await deletePlayerCardRig(supabase, key)
        expect(mocks.deletePlayerCardOverlay).toHaveBeenCalledWith(supabase, { ...key, slot: 'rig' })
    })

    it('reports a missing rig', async () => {
        mocks.deletePlayerCardOverlay.mockResolvedValue(Ok(null))
        const result = await deletePlayerCardRig(supabase, key)
        expect(!result.ok && result.error.code).toBe('NOT_FOUND')
        expect(!result.ok && result.error.message).toBe('This player has no rig for this season and group')
        expect(mocks.remove).not.toHaveBeenCalled()
    })

    it('removes the file', async () => {
        expect(await deletePlayerCardRig(supabase, key)).toEqual(Ok(null))
        expect(mocks.remove).toHaveBeenCalledWith(['rig.png'])
    })

    it('still succeeds when the file removal fails', async () => {
        mocks.remove.mockResolvedValue({ error: { message: 'storage down' } })
        expect(await deletePlayerCardRig(supabase, key)).toEqual(Ok(null))
    })
})
