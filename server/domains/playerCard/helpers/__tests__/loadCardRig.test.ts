import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Err, Ok } from '@/shared/types/result'
import type { DBClient } from '@/shared/types/db'
import type { CardLayer } from '../../types'
import { hasRigLayer, loadCardRig } from '../loadCardRig'

const mocks = vi.hoisted(() => ({
    findPlayerCardOverlay: vi.fn(),
    loadImageCached: vi.fn(),
    loadImageAsPngDataUri: vi.fn(),
    cropRigToBox: vi.fn(),
}))

vi.mock('@/server/db/playerCards.repo', () => ({ findPlayerCardOverlay: mocks.findPlayerCardOverlay }))
vi.mock('../loadImage', () => ({
    loadImageCached: mocks.loadImageCached,
    loadImageAsPngDataUri: mocks.loadImageAsPngDataUri,
}))
vi.mock('../cropRigToBox', () => ({ cropRigToBox: mocks.cropRigToBox }))

const supabase = {} as DBClient
const rigLayer = { kind: 'image', field: 'rig', x: 10, y: 20, w: 400, h: 400, fit: 'cover' } as CardLayer
const headshot = { kind: 'image', field: 'headshot', x: 0, y: 0, w: 10, h: 10, fit: 'cover' } as CardLayer
const row = { image_url: 'https://x/rig.png', width: 800, height: 800, image_x: null, image_y: null, image_w: null }
const saved = { ...row, image_x: 4, image_y: 5, image_w: 600 }
const source = Buffer.from('source')
const dataUri = (b: Buffer) => `data:image/png;base64,${b.toString('base64')}`
const input = {
    playerId: 'p' as string | null,
    seasonNumber: 3,
    groupId: 'g',
    layers: [rigLayer],
    cached: false,
}

describe('hasRigLayer', () => {
    it('finds only the rig field', () => {
        expect(hasRigLayer([rigLayer])).toBe(true)
        expect(hasRigLayer([headshot])).toBe(false)
    })
})

describe('loadCardRig', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mocks.findPlayerCardOverlay.mockResolvedValue(Ok(row))
        mocks.loadImageAsPngDataUri.mockResolvedValue(Ok(dataUri(source)))
        mocks.loadImageCached.mockResolvedValue(Ok(dataUri(source)))
        mocks.cropRigToBox.mockResolvedValue(Buffer.from('cropped'))
    })

    it('skips the lookup for an unregistered player', async () => {
        expect(await loadCardRig(supabase, { ...input, playerId: null })).toEqual(Ok(null))
        expect(mocks.findPlayerCardOverlay).not.toHaveBeenCalled()
    })

    it('looks up by player, season, group and slot', async () => {
        await loadCardRig(supabase, input)
        expect(mocks.findPlayerCardOverlay).toHaveBeenCalledWith(supabase, { playerId: 'p', seasonNumber: 3, groupId: 'g', slot: 'rig' })
    })

    it('returns null with no rig row, even when the layout has no Rig segment', async () => {
        mocks.findPlayerCardOverlay.mockResolvedValue(Ok(null))
        expect(await loadCardRig(supabase, { ...input, layers: [headshot] })).toEqual(Ok(null))
    })

    it('returns a lookup error rather than treating it as no rig', async () => {
        const failure = Err({ message: 'down', code: 'DB_ERROR' as const })
        mocks.findPlayerCardOverlay.mockResolvedValue(failure)
        expect(await loadCardRig(supabase, input)).toEqual(failure)
    })

    it('fails when the layout has no Rig segment', async () => {
        const result = await loadCardRig(supabase, { ...input, layers: [headshot] })
        expect(!result.ok && result.error.code).toBe('VALIDATION_ERROR')
        expect(!result.ok && result.error.message).toBe('This layout has no Rig segment, so the rig has nowhere to go')
    })

    it('fails when the image cannot be loaded', async () => {
        mocks.loadImageAsPngDataUri.mockResolvedValue(Err({ message: 'x', code: 'INTEGRATION_ERROR' as const }))
        const result = await loadCardRig(supabase, input)
        expect(!result.ok && result.error.code).toBe('INTEGRATION_ERROR')
        expect(!result.ok && result.error.message).toBe('The rig image could not be loaded')
    })

    it('fails when the image cannot be cropped', async () => {
        mocks.cropRigToBox.mockRejectedValue(new Error('bad png'))
        const result = await loadCardRig(supabase, input)
        expect(!result.ok && result.error.message).toBe('The rig image could not be loaded')
    })

    it('reads fresh bytes when not cached', async () => {
        await loadCardRig(supabase, input)
        expect(mocks.loadImageAsPngDataUri).toHaveBeenCalledWith(row.image_url)
        expect(mocks.loadImageCached).not.toHaveBeenCalled()
    })

    it('reads through the cache when cached', async () => {
        await loadCardRig(supabase, { ...input, cached: true })
        expect(mocks.loadImageCached).toHaveBeenCalledWith(row.image_url)
        expect(mocks.loadImageAsPngDataUri).not.toHaveBeenCalled()
    })

    it('fills the Rig box when no placement is saved', async () => {
        const result = await loadCardRig(supabase, input)
        const [bytes, image, placement, box] = mocks.cropRigToBox.mock.calls[0]
        expect(bytes.equals(source)).toBe(true)
        expect(image).toEqual({ width: 800, height: 800 })
        expect(placement).toEqual({ imageX: 0, imageY: 0, imageW: 400 })
        expect(box).toEqual({ w: 400, h: 400 })
        expect(result).toEqual(Ok(dataUri(Buffer.from('cropped'))))
    })

    it('uses the saved image placement in the shared box', async () => {
        mocks.findPlayerCardOverlay.mockResolvedValue(Ok(saved))
        await loadCardRig(supabase, input)
        const [, , placement, box] = mocks.cropRigToBox.mock.calls[0]
        expect(placement).toEqual({ imageX: 4, imageY: 5, imageW: 600 })
        expect(box).toEqual({ w: 400, h: 400 })
    })

    it('prefers a placement passed in for a live preview', async () => {
        mocks.findPlayerCardOverlay.mockResolvedValue(Ok(saved))
        const draft = { imageX: 1, imageY: 2, imageW: 999 }
        await loadCardRig(supabase, { ...input, placement: draft })
        expect(mocks.cropRigToBox.mock.calls[0][2]).toEqual(draft)
    })
})
