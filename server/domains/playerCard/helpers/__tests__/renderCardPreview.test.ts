import { beforeEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { Err, Ok } from '@/shared/types/result'
import type { DBClient } from '@/shared/types/db'
import type { CardData, CardLayer } from '../../types'
import { renderCardPreview } from '../renderCardPreview'

const mocks = vi.hoisted(() => ({
    findCardTemplateById: vi.fn(),
    findCardGroupById: vi.fn(),
    loadTemplateArt: vi.fn(),
    loadCardRig: vi.fn(),
    loadCardFonts: vi.fn(),
    renderCard: vi.fn(),
}))

vi.mock('@/server/db/playerCards.repo', () => ({
    findCardTemplateById: mocks.findCardTemplateById,
    findCardGroupById: mocks.findCardGroupById,
}))
vi.mock('../loadImage', () => ({ loadImageCached: vi.fn(async () => Ok('image')) }))
vi.mock('../loadTemplateArt', () => ({ loadTemplateArt: mocks.loadTemplateArt }))
vi.mock('../loadCardRig', () => ({ loadCardRig: mocks.loadCardRig }))
vi.mock('../cardFont', () => ({ loadCardFonts: mocks.loadCardFonts }))
vi.mock('../renderCard', () => ({ renderCard: mocks.renderCard }))

const supabase = {} as DBClient
const layers = [{ kind: 'image', field: 'headshot', x: 0, y: 0, w: 10, h: 10, fit: 'cover' }] as CardLayer[]
const input = {
    templateId: 't',
    layers,
    avatarUrl: null,
    teamLogoUrl: null,
    data: {} as CardData,
    rigPlayerId: 'p',
    seasonNumber: 3,
    rigPlacement: { imageX: 0, imageY: 0, imageW: 30 },
}

describe('renderCardPreview rig', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        mocks.findCardTemplateById.mockResolvedValue(Ok({ id: 't', group_id: 'g', name: 'Ruby', min_ovr: 1 }))
        mocks.findCardGroupById.mockResolvedValue(Ok({ id: 'g', canvas_width: 100, canvas_height: 140 }))
        mocks.loadTemplateArt.mockResolvedValue(Ok({}))
        mocks.loadCardFonts.mockResolvedValue(Ok({}))
        mocks.loadCardRig.mockResolvedValue(Ok('rig-uri'))
        mocks.renderCard.mockResolvedValue(await sharp({ create: { width: 10, height: 10, channels: 4, background: '#000000' } }).png().toBuffer())
    })

    it('resolves the rig through the cache using the draft layers', async () => {
        await renderCardPreview(supabase, input)
        expect(mocks.loadCardRig).toHaveBeenCalledWith(supabase, {
            playerId: 'p',
            seasonNumber: 3,
            groupId: 'g',
            layers,
            cached: true,
            placement: { imageX: 0, imageY: 0, imageW: 30 },
        })
    })

    it('passes the rig to the renderer', async () => {
        const result = await renderCardPreview(supabase, input)
        expect(result.ok).toBe(true)
        expect(mocks.renderCard.mock.calls[0][2].rig).toBe('rig-uri')
    })

    it('shows a rig failure as the preview error rather than a headshot', async () => {
        const failure = Err({ message: 'The rig image could not be loaded', code: 'INTEGRATION_ERROR' as const })
        mocks.loadCardRig.mockResolvedValue(failure)
        expect(await renderCardPreview(supabase, input)).toEqual(failure)
        expect(mocks.renderCard).not.toHaveBeenCalled()
    })
})
