import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Ok } from '@/shared/types/result'
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
vi.mock('@/server/roblox/users', () => ({ getRobloxLargeHeadshot: vi.fn().mockResolvedValue({ ok: true, value: null }) }))
vi.mock('../loadImage', () => ({ loadImageAsPngDataUri: vi.fn() }))
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
