import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Err, Ok } from '@/shared/types/result'
import type { DBClient } from '@/shared/types/db'
import { updatePlayerCardRigPlacement } from '../updatePlayerCardRigPlacement'

const mocks = vi.hoisted(() => ({ updatePlayerCardOverlayPlacement: vi.fn() }))

vi.mock('@/server/db/playerCards.repo', () => ({ updatePlayerCardOverlayPlacement: mocks.updatePlayerCardOverlayPlacement }))

const supabase = {} as DBClient
const placement = { imageX: 4, imageY: 5, imageW: 600 }
const input = { playerId: 'p', seasonNumber: 3, groupId: 'g', placement }
const row = {
    player_id: 'p',
    season_number: 3,
    group_id: 'g',
    image_url: 'u',
    width: 800,
    height: 800,
    uploaded_at: 't',
    image_x: 4,
    image_y: 5,
    image_w: 600,
}

describe('updatePlayerCardRigPlacement', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mocks.updatePlayerCardOverlayPlacement.mockResolvedValue(Ok(row))
    })

    it('writes the placement for the rig slot and returns the rig', async () => {
        const result = await updatePlayerCardRigPlacement(supabase, input)
        expect(mocks.updatePlayerCardOverlayPlacement).toHaveBeenCalledWith(supabase, {
            playerId: 'p',
            seasonNumber: 3,
            groupId: 'g',
            slot: 'rig',
            placement,
        })
        expect(result.ok && result.value.placement).toEqual(placement)
    })

    it('reports a rig that no longer exists', async () => {
        mocks.updatePlayerCardOverlayPlacement.mockResolvedValue(Ok(null))
        const result = await updatePlayerCardRigPlacement(supabase, input)
        expect(!result.ok && result.error.code).toBe('NOT_FOUND')
        expect(!result.ok && result.error.message).toBe('This player has no rig for this season and group')
    })

    it('returns a write error', async () => {
        const failure = Err({ message: 'nope', code: 'DB_ERROR' as const })
        mocks.updatePlayerCardOverlayPlacement.mockResolvedValue(failure)
        expect(await updatePlayerCardRigPlacement(supabase, input)).toEqual(failure)
    })
})
