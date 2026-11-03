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
vi.mock('../renderCard', () => ({ renderCard: mocks.renderCard }))
vi.mock('../cardFont', () => ({ loadCardFonts: mocks.loadCardFonts }))

const supabase = {} as DBClient
const art = { kind: 'art', src: 'bg.png', x: 0, y: 0, w: 100, h: 100 }
const ovrText = { kind: 'text', field: 'ovr', x: 0, y: 0, w: 10, h: 10, size: 10 }
const groupRow = { id: 'g', name: 'Holiday', is_active: true, canvas_width: 100, canvas_height: 100, layers: [art, ovrText] }
const tierRow = { id: 't', group_id: 'g', name: 'Ruby', min_ovr: 1 }
const subject = { robloxUserId: '1', avatarUrl: null, teamId: null, teamLogoUrl: null } as CardSubject
const data = { ovr: 80, position: null, attributes: {} } as unknown as CardData
const input = { seasonNumber: 2, groupId: 'g', subject, data, ensurePlayerId: async () => Ok('p') }

describe('renderAndSaveCard guards', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.findCardGroupById.mockResolvedValue(Ok(groupRow))
        mocks.findCardTemplates.mockResolvedValue(Ok([tierRow]))
        mocks.loadTemplateArt.mockResolvedValue(Ok({ 'bg.png': 'uri' }))
        mocks.getRobloxLargeHeadshot.mockResolvedValue(Ok(null))
    })

    it('refuses a layout with no art layer before loading or uploading anything', async () => {
        mocks.findCardGroupById.mockResolvedValue(Ok({ ...groupRow, layers: [ovrText] }))
        const result = await renderAndSaveCard(supabase, input)
        expect(!result.ok && result.error.code).toBe('VALIDATION_ERROR')
        expect(!result.ok && result.error.message).toContain('no art layer')
        expect(mocks.loadTemplateArt).not.toHaveBeenCalled()
        expect(mocks.upload).not.toHaveBeenCalled()
    })

    it('refuses an inactive group', async () => {
        mocks.findCardGroupById.mockResolvedValue(Ok({ ...groupRow, is_active: false }))
        const result = await renderAndSaveCard(supabase, input)
        expect(!result.ok && result.error.message).toContain('inactive')
        expect(mocks.upload).not.toHaveBeenCalled()
    })

    it('never saves a card when a tier is missing a file', async () => {
        const missing = { ok: false, error: { message: 'Tier Ruby has no art file "bg.png" in its folder', code: 'NOT_FOUND' } }
        mocks.loadTemplateArt.mockResolvedValue(missing)
        const result = await renderAndSaveCard(supabase, input)
        expect(result).toEqual(missing)
        expect(mocks.loadTemplateArt).toHaveBeenCalledWith(expect.objectContaining({ id: 't' }), { cached: false, allowMissing: false })
        expect(mocks.upload).not.toHaveBeenCalled()
        expect(mocks.upsertPlayerCard).not.toHaveBeenCalled()
    })
})

describe('renderAndSaveCard images', () => {
    const logoSubject = { ...subject, avatarUrl: 'https://x/avatar.png', teamLogoUrl: 'https://x/logo.png' } as CardSubject
    const strict = { ...input, strictImages: true, generatedBy: 'u' }

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
    })

    describe('strict images', () => {
        it('fails with no upload when Roblox errors', async () => {
            mocks.getRobloxLargeHeadshot.mockResolvedValue(Err({ message: 'down', code: 'INTEGRATION_ERROR' }))
            const result = await renderAndSaveCard(supabase, strict)
            expect(!result.ok && result.error.code).toBe('INTEGRATION_ERROR')
            expect(!result.ok && result.error.message).toContain('headshot')
            expect(mocks.upload).not.toHaveBeenCalled()
            expect(mocks.upsertPlayerCard).not.toHaveBeenCalled()
        })

        it('fails when Roblox has no completed headshot, even with a stored avatar', async () => {
            mocks.getRobloxLargeHeadshot.mockResolvedValue(Ok(null))
            const result = await renderAndSaveCard(supabase, { ...strict, subject: logoSubject })
            expect(!result.ok && result.error.message).toContain('headshot')
            expect(mocks.loadImageAsPngDataUri).not.toHaveBeenCalledWith('https://x/avatar.png')
            expect(mocks.upload).not.toHaveBeenCalled()
        })

        it('fails when the headshot image does not load', async () => {
            mocks.loadImageAsPngDataUri.mockResolvedValue(Err({ message: 'bad', code: 'INTEGRATION_ERROR' }))
            const result = await renderAndSaveCard(supabase, strict)
            expect(!result.ok && result.error.message).toContain('headshot')
            expect(mocks.upload).not.toHaveBeenCalled()
        })

        it('fails when a team logo URL does not load', async () => {
            mocks.loadImageAsPngDataUri.mockImplementation(async (url: string) =>
                url === 'https://x/logo.png' ? Err({ message: 'bad', code: 'INTEGRATION_ERROR' }) : Ok('data:image/png;base64,x'))
            const result = await renderAndSaveCard(supabase, { ...strict, subject: logoSubject })
            expect(!result.ok && result.error.code).toBe('INTEGRATION_ERROR')
            expect(!result.ok && result.error.message).toContain('logo')
            expect(mocks.upload).not.toHaveBeenCalled()
        })

        it('succeeds for a player with no team logo URL', async () => {
            const result = await renderAndSaveCard(supabase, strict)
            expect(result.ok).toBe(true)
            expect(mocks.upload).toHaveBeenCalledOnce()
        })

        it('saves generated_by when given', async () => {
            await renderAndSaveCard(supabase, strict)
            expect(mocks.upsertPlayerCard.mock.calls[0][1]).toMatchObject({ generated_by: 'u' })
        })
    })

    it('single generate still falls back to the stored avatar', async () => {
        mocks.getRobloxLargeHeadshot.mockResolvedValue(Ok(null))
        const result = await renderAndSaveCard(supabase, { ...input, subject: { ...logoSubject, teamLogoUrl: null } })
        expect(result.ok).toBe(true)
        expect(mocks.loadImageAsPngDataUri).toHaveBeenCalledWith('https://x/avatar.png')
        expect(mocks.upload).toHaveBeenCalledOnce()
    })

    it('loads each tier art once when given an art cache', async () => {
        const artCache = new Map<string, Record<string, string>>()
        await renderAndSaveCard(supabase, { ...input, artCache })
        await renderAndSaveCard(supabase, { ...input, artCache })
        expect(mocks.loadTemplateArt).toHaveBeenCalledOnce()
        expect(mocks.renderCard.mock.calls[1][2].art).toEqual({ 'bg.png': 'uri' })
    })

    it('tries again after a failed art load', async () => {
        const artCache = new Map<string, Record<string, string>>()
        mocks.loadTemplateArt.mockResolvedValueOnce(Err({ message: 'art failed', code: 'INTEGRATION_ERROR' as const }))
        const first = await renderAndSaveCard(supabase, { ...input, artCache })
        await renderAndSaveCard(supabase, { ...input, artCache })
        expect(first.ok).toBe(false)
        expect(mocks.loadTemplateArt).toHaveBeenCalledTimes(2)
    })

    it('loads art every time without an art cache', async () => {
        await renderAndSaveCard(supabase, input)
        await renderAndSaveCard(supabase, input)
        expect(mocks.loadTemplateArt).toHaveBeenCalledTimes(2)
    })

    it('leaves generated_by out when not given', async () => {
        await renderAndSaveCard(supabase, input)
        expect(mocks.upsertPlayerCard.mock.calls[0][1]).not.toHaveProperty('generated_by')
    })
})
