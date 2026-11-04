import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Err, Ok } from '@/shared/types/result'
import type { DBClient } from '@/shared/types/db'
import type { CardData, CardSubject } from '../../types'
import { renderAndSaveCard } from '../renderAndSaveCard'

const mocks = vi.hoisted(() => ({
    findCardGroupById: vi.fn(),
    findCardTemplates: vi.fn(),
    findPlayerCard: vi.fn(),
    upsertPlayerCard: vi.fn(),
    loadTemplateArt: vi.fn(),
    loadCardRig: vi.fn(),
    renderCard: vi.fn(),
    loadCardFonts: vi.fn(),
    upload: vi.fn(),
    getRobloxLargeHeadshot: vi.fn(),
    loadImageAsPngDataUri: vi.fn(),
}))

vi.mock('@/server/db/playerCards.repo', () => ({
    findCardGroupById: mocks.findCardGroupById,
    findCardTemplates: mocks.findCardTemplates,
    findPlayerCard: mocks.findPlayerCard,
    upsertPlayerCard: mocks.upsertPlayerCard,
}))
vi.mock('@/server/supabase/admin', () => ({
    getSupabaseAdmin: () => ({
        storage: { from: () => ({ upload: mocks.upload, remove: vi.fn(), getPublicUrl: () => ({ data: { publicUrl: 'https://x/card.png' } }) }) },
    }),
}))
vi.mock('@/server/storage/toCdnUrl', () => ({ toCdnUrl: (url: string) => url }))
vi.mock('@/server/roblox/users', () => ({ getRobloxLargeHeadshot: mocks.getRobloxLargeHeadshot }))
vi.mock('../loadImage', () => ({ loadImageAsPngDataUri: mocks.loadImageAsPngDataUri }))
vi.mock('../loadTemplateArt', () => ({ loadTemplateArt: mocks.loadTemplateArt }))
vi.mock('../loadCardRig', () => ({ loadCardRig: mocks.loadCardRig }))
vi.mock('../renderCard', () => ({ renderCard: mocks.renderCard }))
vi.mock('../cardFont', () => ({ loadCardFonts: mocks.loadCardFonts }))

const supabase = {} as DBClient
const art = { kind: 'art', src: 'bg.png', x: 0, y: 0, w: 100, h: 100 }
const headshot = { kind: 'image', field: 'headshot', x: 0, y: 0, w: 50, h: 50 }
const groupRow = { id: 'g', name: 'Base', is_active: true, canvas_width: 100, canvas_height: 100, layers: [art, headshot] }
const tierRow = { id: 't', group_id: 'g', name: 'Ruby', min_ovr: 1 }
const subject = { playerId: 'p', robloxUserId: '1', avatarUrl: null, teamId: null, teamLogoUrl: null } as CardSubject
const data = { ovr: 80, position: null, attributes: {} } as unknown as CardData
const input = { seasonNumber: 2, groupId: 'g', subject, data, ensurePlayerId: async () => Ok('p') }
const rig = 'rig-uri'
const broken = Err({ message: 'The rig image could not be loaded', code: 'INTEGRATION_ERROR' as const })

describe('renderAndSaveCard rig', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.findCardGroupById.mockResolvedValue(Ok(groupRow))
        mocks.findCardTemplates.mockResolvedValue(Ok([tierRow]))
        mocks.findPlayerCard.mockResolvedValue(Ok(null))
        mocks.upsertPlayerCard.mockResolvedValue(Ok({ player_id: 'p', season_number: 2, group_id: 'g', template_id: 't', ovr: 80, image_url: 'u', generated_at: 'now' }))
        mocks.loadTemplateArt.mockResolvedValue(Ok({ 'bg.png': 'uri' }))
        mocks.loadCardFonts.mockResolvedValue(Ok([]))
        mocks.renderCard.mockResolvedValue(Buffer.from('png'))
        mocks.upload.mockResolvedValue({ error: null })
        mocks.getRobloxLargeHeadshot.mockResolvedValue(Ok('https://x/large.png'))
        mocks.loadImageAsPngDataUri.mockResolvedValue(Ok('data:image/png;base64,x'))
        mocks.loadCardRig.mockResolvedValue(Ok(rig))
    })

    it('looks up the rig for this player, season and group, reading fresh bytes', async () => {
        await renderAndSaveCard(supabase, input)
        expect(mocks.loadCardRig).toHaveBeenCalledWith(supabase, expect.objectContaining({
            playerId: 'p',
            seasonNumber: 2,
            groupId: 'g',
            cached: false,
            layers: [expect.objectContaining({ kind: 'art' }), expect.objectContaining({ field: 'headshot' })],
        }))
    })

    it('draws the rig on the saved card', async () => {
        const result = await renderAndSaveCard(supabase, input)
        expect(result.ok).toBe(true)
        expect(mocks.renderCard.mock.calls[0][2].rig).toEqual(rig)
        expect(mocks.upload).toHaveBeenCalledOnce()
    })

    it('saves a headshot card as before when the player has no rig', async () => {
        mocks.loadCardRig.mockResolvedValue(Ok(null))
        const result = await renderAndSaveCard(supabase, input)
        expect(result.ok).toBe(true)
        expect(mocks.renderCard.mock.calls[0][2].rig).toBeNull()
        expect(mocks.renderCard.mock.calls[0][2].headshot).toBe('data:image/png;base64,x')
    })

    it('fails single Generate on a broken rig instead of using the headshot', async () => {
        mocks.loadCardRig.mockResolvedValue(broken)
        expect(await renderAndSaveCard(supabase, input)).toEqual(broken)
        expect(mocks.renderCard).not.toHaveBeenCalled()
        expect(mocks.upload).not.toHaveBeenCalled()
        expect(mocks.upsertPlayerCard).not.toHaveBeenCalled()
    })

    it('fails a bulk card on a broken rig without spending a Roblox call', async () => {
        mocks.loadCardRig.mockResolvedValue(broken)
        expect(await renderAndSaveCard(supabase, { ...input, strictImages: true })).toEqual(broken)
        expect(mocks.getRobloxLargeHeadshot).not.toHaveBeenCalled()
        expect(mocks.upload).not.toHaveBeenCalled()
    })

    it('still fails a bulk card when Roblox has no headshot, even with a rig', async () => {
        mocks.getRobloxLargeHeadshot.mockResolvedValue(Ok(null))
        const result = await renderAndSaveCard(supabase, { ...input, strictImages: true })
        expect(!result.ok && result.error.message).toContain('headshot')
        expect(mocks.upload).not.toHaveBeenCalled()
    })
})
