import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Err, Ok } from '@/shared/types/result'
import type { DBClient } from '@/shared/types/db'
import { cardTemplateFileName, getCardTierTemplate } from '../getCardTierTemplate'

const mocks = vi.hoisted(() => ({
    findCardTemplateById: vi.fn(),
    findCardGroupById: vi.fn(),
    loadTemplateArt: vi.fn(),
    loadCardFonts: vi.fn(),
    renderCard: vi.fn(),
}))

vi.mock('@/server/db/playerCards.repo', () => ({
    findCardTemplateById: mocks.findCardTemplateById,
    findCardGroupById: mocks.findCardGroupById,
}))
vi.mock('../../helpers/loadTemplateArt', () => ({ loadTemplateArt: mocks.loadTemplateArt }))
vi.mock('../../helpers/cardFont', () => ({ loadCardFonts: mocks.loadCardFonts }))
vi.mock('../../helpers/renderCard', () => ({ renderCard: mocks.renderCard }))

const supabase = {} as DBClient
const art = { kind: 'art', src: 'bg.png', x: 0, y: 0, w: 1000, h: 1400 }
const ovrText = { kind: 'text', field: 'ovr', x: 0, y: 0, w: 10, h: 10, size: 10 }
const groupRow = { id: 'g', name: 'Base', is_active: true, canvas_width: 1000, canvas_height: 1400, layers: [art, ovrText] }
const tierRow = { id: 't', group_id: 'g', name: 'Ruby', min_ovr: 93 }

describe('getCardTierTemplate', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.findCardTemplateById.mockResolvedValue(Ok(tierRow))
        mocks.findCardGroupById.mockResolvedValue(Ok(groupRow))
        mocks.loadTemplateArt.mockResolvedValue(Ok({ 'bg.png': 'uri' }))
        mocks.loadCardFonts.mockResolvedValue(Ok({}))
        mocks.renderCard.mockResolvedValue(Buffer.from('png'))
    })

    it('renders only the art, stretched to the full canvas', async () => {
        await getCardTierTemplate(supabase, 't')
        const [template, , assets] = mocks.renderCard.mock.calls[0]
        expect(template.layers).toEqual([{ kind: 'art', src: 'bg.png', x: 0, y: 0, w: 1000, h: 1400 }])
        expect(template.width).toBe(1000)
        expect(template.height).toBe(1400)
        expect(assets).toEqual({ art: { 'bg.png': 'uri' }, headshot: null, teamLogo: null })
    })

    it('ignores an art layer box smaller than the canvas', async () => {
        mocks.findCardGroupById.mockResolvedValue(Ok({ ...groupRow, layers: [{ ...art, x: 50, y: 50, w: 500, h: 500 }] }))
        await getCardTierTemplate(supabase, 't')
        const [template] = mocks.renderCard.mock.calls[0]
        expect(template.layers).toEqual([{ kind: 'art', src: 'bg.png', x: 0, y: 0, w: 1000, h: 1400 }])
    })

    it('loads fresh art and refuses a missing file', async () => {
        await getCardTierTemplate(supabase, 't')
        expect(mocks.loadTemplateArt).toHaveBeenCalledWith(expect.objectContaining({ id: 't' }), { cached: false, allowMissing: false })
    })

    it('returns a PNG data URI and a file name', async () => {
        expect(await getCardTierTemplate(supabase, 't')).toEqual(Ok({
            fileName: 'base-ruby-template.png',
            dataUri: 'data:image/png;base64,cG5n',
        }))
    })

    it('fails when the tier has no art file', async () => {
        const missing = Err({ message: 'Tier Ruby has no art file "bg.png" in its folder', code: 'NOT_FOUND' as const })
        mocks.loadTemplateArt.mockResolvedValue(missing)
        expect(await getCardTierTemplate(supabase, 't')).toEqual(missing)
        expect(mocks.renderCard).not.toHaveBeenCalled()
    })

    it('fails when the layout has no art layer', async () => {
        mocks.findCardGroupById.mockResolvedValue(Ok({ ...groupRow, layers: [ovrText] }))
        const result = await getCardTierTemplate(supabase, 't')
        expect(!result.ok && result.error.code).toBe('VALIDATION_ERROR')
        expect(mocks.renderCard).not.toHaveBeenCalled()
    })

    it('returns NOT_FOUND for an unknown tier', async () => {
        mocks.findCardTemplateById.mockResolvedValue(Ok(null))
        const result = await getCardTierTemplate(supabase, 't')
        expect(!result.ok && result.error.code).toBe('NOT_FOUND')
    })

    it('returns NOT_FOUND for a missing group', async () => {
        mocks.findCardGroupById.mockResolvedValue(Ok(null))
        const result = await getCardTierTemplate(supabase, 't')
        expect(!result.ok && result.error.code).toBe('NOT_FOUND')
    })
})

describe('cardTemplateFileName', () => {
    it('slugs names', () => {
        expect(cardTemplateFileName('Base Set!', 'Ruby 93')).toBe('base-set-ruby-93-template.png')
    })
})
