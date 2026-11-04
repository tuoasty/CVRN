import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Err, Ok } from '@/shared/types/result'
import type { DBClient } from '@/shared/types/db'
import { CARD_ART_MAX_BYTES } from '../../types'
import { uploadPlayerCardRig } from '../uploadPlayerCardRig'

const mocks = vi.hoisted(() => ({
    findCardGroupById: vi.fn(),
    findPlayerCardOverlay: vi.fn(),
    upsertPlayerCardOverlay: vi.fn(),
    inspectCardArt: vi.fn(),
    isFullyOpaque: vi.fn(),
    upload: vi.fn(),
    remove: vi.fn(),
    ensurePlayerId: vi.fn(),
}))

vi.mock('@/server/db/playerCards.repo', () => ({
    findCardGroupById: mocks.findCardGroupById,
    findPlayerCardOverlay: mocks.findPlayerCardOverlay,
    upsertPlayerCardOverlay: mocks.upsertPlayerCardOverlay,
}))
vi.mock('../../helpers/inspectCardArt', () => ({
    inspectCardArt: mocks.inspectCardArt,
    isFullyOpaque: mocks.isFullyOpaque,
}))
vi.mock('@/server/supabase/admin', () => ({
    getSupabaseAdmin: () => ({
        storage: {
            from: () => ({
                upload: mocks.upload,
                remove: mocks.remove,
                getPublicUrl: (path: string) => ({ data: { publicUrl: `https://x/${path}` } }),
            }),
        },
    }),
}))
vi.mock('@/server/storage/toCdnUrl', () => ({ toCdnUrl: (url: string) => url }))

const supabase = {} as DBClient
const bytes = new Uint8Array([1, 2, 3, 4])
const art = { kind: 'art', src: 'bg.png', x: 0, y: 0, w: 1000, h: 1400 }
const rigLayer = { kind: 'image', field: 'rig', x: 0, y: 0, w: 100, h: 100, fit: 'cover' }
const group = { id: 'g', name: 'Base', canvas_width: 1000, canvas_height: 1400, layers: [art, rigLayer] }
const savedRow = { player_id: 'p', season_number: 3, group_id: 'g', image_url: 'https://x/new.png', image_path: 'new.png', width: 1000, height: 1400, uploaded_at: 't', image_w: null }
const input = (file = new File([bytes], 'rig.png', { type: 'image/png' })) => ({
    seasonNumber: 3,
    groupId: 'g',
    file,
    ensurePlayerId: mocks.ensurePlayerId,
})

function expectNothingStored() {
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.upsertPlayerCardOverlay).not.toHaveBeenCalled()
    expect(mocks.ensurePlayerId).not.toHaveBeenCalled()
}

describe('uploadPlayerCardRig', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mocks.findCardGroupById.mockResolvedValue(Ok(group))
        mocks.findPlayerCardOverlay.mockResolvedValue(Ok(null))
        mocks.upsertPlayerCardOverlay.mockResolvedValue(Ok(savedRow))
        mocks.inspectCardArt.mockResolvedValue(Ok({ width: 1000, height: 1400 }))
        mocks.isFullyOpaque.mockResolvedValue(false)
        mocks.upload.mockResolvedValue({ error: null })
        mocks.remove.mockResolvedValue({ error: null })
        mocks.ensurePlayerId.mockResolvedValue(Ok('p'))
    })

    it('rejects a file over the limit', async () => {
        const big = new File([new Uint8Array(CARD_ART_MAX_BYTES + 1)], 'rig.png', { type: 'image/png' })
        const result = await uploadPlayerCardRig(supabase, input(big))
        expect(!result.ok && result.error.message).toBe('Rig must be 2.9 MB or smaller. Export a smaller PNG.')
        expectNothingStored()
    })

    it('rejects a missing group', async () => {
        mocks.findCardGroupById.mockResolvedValue(Ok(null))
        const result = await uploadPlayerCardRig(supabase, input())
        expect(!result.ok && result.error.code).toBe('NOT_FOUND')
        expectNothingStored()
    })

    it('rejects a layout with no Rig segment', async () => {
        mocks.findCardGroupById.mockResolvedValue(Ok({ ...group, layers: [art] }))
        const result = await uploadPlayerCardRig(supabase, input())
        expect(!result.ok && result.error.message).toBe('This layout has no Rig segment, so the rig has nowhere to go')
        expectNothingStored()
    })

    it('accepts any dimensions and stores the file size on the row', async () => {
        mocks.inspectCardArt.mockResolvedValue(Ok({ width: 2000, height: 3000 }))
        const result = await uploadPlayerCardRig(supabase, input())
        expect(result.ok).toBe(true)
        expect(mocks.upsertPlayerCardOverlay.mock.calls[0][1]).toMatchObject({ width: 2000, height: 3000 })
    })

    it('rejects a file the inspector refuses', async () => {
        const failure = Err({ message: 'Art must be a PNG file', code: 'VALIDATION_ERROR' as const })
        mocks.inspectCardArt.mockResolvedValue(failure)
        expect(await uploadPlayerCardRig(supabase, input())).toEqual(failure)
        expectNothingStored()
    })

    it('clears any saved placement when a rig is replaced', async () => {
        await uploadPlayerCardRig(supabase, input())
        expect(mocks.upsertPlayerCardOverlay.mock.calls[0][1]).toMatchObject({ image_x: null, image_y: null, image_w: null })
    })

    it('rejects an opaque PNG', async () => {
        mocks.isFullyOpaque.mockResolvedValue(true)
        const result = await uploadPlayerCardRig(supabase, input())
        expect(!result.ok && result.error.code).toBe('VALIDATION_ERROR')
        expect(!result.ok && result.error.message).toBe('This PNG has no transparent background. Export only the rig, not the whole card.')
        expectNothingStored()
    })

    it('stores the exact bytes and returns the rig', async () => {
        const result = await uploadPlayerCardRig(supabase, input())
        expect(result).toEqual(Ok({ playerId: 'p', seasonNumber: 3, groupId: 'g', imageUrl: 'https://x/new.png', width: 1000, height: 1400, uploadedAt: 't', placement: null }))
        const [path, body, options] = mocks.upload.mock.calls[0]
        expect(path).toMatch(/^card-rigs\/3\/p_g_\d+\.png$/)
        expect([...body]).toEqual([...bytes])
        expect(options).toEqual({ contentType: 'image/png', cacheControl: '31536000', upsert: false })
    })

    it('writes the key and size on the row', async () => {
        await uploadPlayerCardRig(supabase, input())
        expect(mocks.upsertPlayerCardOverlay.mock.calls[0][1]).toMatchObject({
            player_id: 'p',
            season_number: 3,
            group_id: 'g',
            slot: 'rig',
            width: 1000,
            height: 1400,
        })
    })

    it('removes the previous file only after the row is saved', async () => {
        mocks.findPlayerCardOverlay.mockResolvedValue(Ok({ ...savedRow, image_path: 'old.png' }))
        await uploadPlayerCardRig(supabase, input())
        expect(mocks.remove).toHaveBeenCalledWith(['old.png'])
        expect(mocks.upsertPlayerCardOverlay.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0])
    })

    it('keeps the old rig and removes the new file when the row write fails', async () => {
        mocks.findPlayerCardOverlay.mockResolvedValue(Ok({ ...savedRow, image_path: 'old.png' }))
        const failure = Err({ message: 'nope', code: 'DB_ERROR' as const })
        mocks.upsertPlayerCardOverlay.mockResolvedValue(failure)
        const result = await uploadPlayerCardRig(supabase, input())
        expect(result).toEqual(failure)
        expect(mocks.remove).toHaveBeenCalledTimes(1)
        expect(mocks.remove.mock.calls[0][0][0]).toMatch(/^card-rigs\//)
    })

    it('still succeeds when removing the old file fails', async () => {
        mocks.findPlayerCardOverlay.mockResolvedValue(Ok({ ...savedRow, image_path: 'old.png' }))
        mocks.remove.mockResolvedValue({ error: { message: 'storage down' } })
        const result = await uploadPlayerCardRig(supabase, input())
        expect(result.ok).toBe(true)
    })

    it('writes no row when the storage upload fails', async () => {
        mocks.upload.mockResolvedValue({ error: { message: 'storage down' } })
        const result = await uploadPlayerCardRig(supabase, input())
        expect(!result.ok && result.error.code).toBe('INTEGRATION_ERROR')
        expect(mocks.upsertPlayerCardOverlay).not.toHaveBeenCalled()
    })

    it('stops when the player cannot be registered', async () => {
        const failure = Err({ message: 'no player', code: 'DB_ERROR' as const })
        mocks.ensurePlayerId.mockResolvedValue(failure)
        expect(await uploadPlayerCardRig(supabase, input())).toEqual(failure)
        expect(mocks.upload).not.toHaveBeenCalled()
    })
})
