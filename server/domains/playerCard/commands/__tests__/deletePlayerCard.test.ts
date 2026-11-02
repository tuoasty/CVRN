import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Err, Ok } from '@/shared/types/result'
import type { DBClient } from '@/shared/types/db'
import { deletePlayerCard } from '../deletePlayerCard'

const mocks = vi.hoisted(() => ({
    deleteCard: vi.fn(),
    remove: vi.fn(),
}))

vi.mock('@/server/db/playerCards.repo', () => ({ deletePlayerCard: mocks.deleteCard }))
vi.mock('@/server/supabase/admin', () => ({
    getSupabaseAdmin: () => ({ storage: { from: () => ({ remove: mocks.remove }) } }),
}))

const supabase = {} as DBClient
const input = { playerId: 'p', seasonNumber: 2, groupId: 'g' }

describe('deletePlayerCard', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mocks.deleteCard.mockResolvedValue(Ok({ image_path: 'cards/2/p_1.png' }))
        mocks.remove.mockResolvedValue({ error: null })
    })

    it('removes the row, then its PNG', async () => {
        expect(await deletePlayerCard(supabase, input)).toEqual(Ok(null))
        expect(mocks.deleteCard).toHaveBeenCalledWith(supabase, input)
        expect(mocks.remove).toHaveBeenCalledWith(['cards/2/p_1.png'])
    })

    it('still succeeds when the PNG cleanup fails, because the card is gone', async () => {
        mocks.remove.mockResolvedValue({ error: new Error('down') })
        expect(await deletePlayerCard(supabase, input)).toEqual(Ok(null))
    })

    it('returns NOT_FOUND for a missing card and removes nothing', async () => {
        mocks.deleteCard.mockResolvedValue(Ok(null))
        const result = await deletePlayerCard(supabase, input)
        expect(!result.ok && result.error.code).toBe('NOT_FOUND')
        expect(mocks.remove).not.toHaveBeenCalled()
    })

    it('keeps the PNG when the row could not be deleted', async () => {
        const failed = Err({ message: 'no', code: 'FORBIDDEN' as const })
        mocks.deleteCard.mockResolvedValue(failed)
        expect(await deletePlayerCard(supabase, input)).toEqual(failed)
        expect(mocks.remove).not.toHaveBeenCalled()
    })
})
