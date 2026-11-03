import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Err, Ok } from '@/shared/types/result'
import type { DBClient } from '@/shared/types/db'
import type { OverallInputRow } from '@/server/domains/overall'
import type { CardData, CardSubject } from '../../types'
import { getBoardPlayerCardTemplate, getCustomPlayerCardTemplate, getPlayerCardTemplate } from '../getPlayerCardTemplate'

const mocks = vi.hoisted(() => ({
    findCardGroupById: vi.fn(),
    findCardTemplates: vi.fn(),
    loadTemplateArt: vi.fn(),
    loadCardFonts: vi.fn(),
    renderCard: vi.fn(),
    getOverallConfig: vi.fn(),
    buildCardData: vi.fn(),
    buildCustomCardData: vi.fn(),
    resolveCustomSubject: vi.fn(),
}))

vi.mock('@/server/db/playerCards.repo', () => ({
    findCardGroupById: mocks.findCardGroupById,
    findCardTemplates: mocks.findCardTemplates,
}))
vi.mock('@/server/domains/overall', () => ({ getOverallConfig: mocks.getOverallConfig }))
vi.mock('../../helpers/loadTemplateArt', () => ({ loadTemplateArt: mocks.loadTemplateArt }))
vi.mock('../../helpers/cardFont', () => ({ loadCardFonts: mocks.loadCardFonts }))
vi.mock('../../helpers/renderCard', () => ({ renderCard: mocks.renderCard }))
vi.mock('../../helpers/buildCardData', () => ({
    buildCardData: mocks.buildCardData,
    buildCustomCardData: mocks.buildCustomCardData,
}))
vi.mock('../../helpers/customSubject', () => ({ resolveCustomSubject: mocks.resolveCustomSubject }))

const supabase = {} as DBClient
const box = { x: 0, y: 0, w: 10, h: 10 }
const art = { kind: 'art', src: 'bg.png', x: 0, y: 0, w: 1000, h: 1400 }
const headshot = { kind: 'image', field: 'headshot', ...box }
const teamLogo = { kind: 'image', field: 'teamLogo', ...box }
const ovrText = { kind: 'text', field: 'ovr', size: 10, ...box }
const positionText = { kind: 'text', field: 'position', size: 10, ...box }
const username = { kind: 'text', field: 'username', size: 10, ...box }
const customText = { kind: 'text', field: 'custom', text: 'CVRN', size: 10, ...box }
const stats = { kind: 'stats', size: 10, ...box }
const layers = [art, headshot, teamLogo, ovrText, positionText, username, stats, customText]
const groupRow = { id: 'g', name: 'Base', is_active: true, canvas_width: 1000, canvas_height: 1400, layers }
const ruby = { id: 'ruby', group_id: 'g', name: 'Ruby', min_ovr: 93 }
const sapphire = { id: 'sapphire', group_id: 'g', name: 'Sapphire', min_ovr: 1 }
const subject = { username: 'Tuoasty', avatarUrl: 'https://x/avatar.png', teamLogoUrl: 'https://x/logo.png' } as CardSubject
const data = { username: 'Tuoasty', ovr: 95, position: 'SET', attributes: {} } as unknown as CardData
const input = { seasonNumber: 2, groupId: 'g', subject, data }

function arrange() {
    vi.clearAllMocks()
    mocks.findCardGroupById.mockResolvedValue(Ok(groupRow))
    mocks.findCardTemplates.mockResolvedValue(Ok([ruby, sapphire]))
    mocks.loadTemplateArt.mockResolvedValue(Ok({ 'bg.png': 'art-uri' }))
    mocks.loadCardFonts.mockResolvedValue(Ok({}))
    mocks.renderCard.mockResolvedValue(Buffer.from('png'))
    mocks.buildCardData.mockReturnValue(data)
    mocks.buildCustomCardData.mockReturnValue(data)
}

describe('getPlayerCardTemplate', () => {
    beforeEach(arrange)

    it('renders only the art, username and stats', async () => {
        await getPlayerCardTemplate(supabase, input)
        const [template, rendered] = mocks.renderCard.mock.calls[0]
        expect(template.layers.map((l: { kind: string; field?: string }) => l.field ?? l.kind)).toEqual(['art', 'username', 'stats'])
        expect(rendered).toBe(data)
    })

    it('supplies no headshot or team logo', async () => {
        await getPlayerCardTemplate(supabase, input)
        expect(mocks.renderCard.mock.calls[0][2]).toEqual({ art: { 'bg.png': 'art-uri' }, headshot: null, teamLogo: null })
    })

    it('uses the art of the tier for the OVR', async () => {
        await getPlayerCardTemplate(supabase, { ...input, data: { ...data, ovr: 80 } })
        expect(mocks.loadTemplateArt).toHaveBeenCalledWith(expect.objectContaining({ id: 'sapphire' }), { cached: false, allowMissing: false })
    })

    it('returns a PNG data URI named after the player', async () => {
        expect(await getPlayerCardTemplate(supabase, input)).toEqual(Ok({
            fileName: 'base-tuoasty-template.png',
            dataUri: 'data:image/png;base64,cG5n',
        }))
    })

    it('fails when no tier covers the OVR', async () => {
        mocks.findCardTemplates.mockResolvedValue(Ok([ruby]))
        const result = await getPlayerCardTemplate(supabase, { ...input, data: { ...data, ovr: 80 } })
        expect(!result.ok && result.error.code).toBe('NOT_FOUND')
        expect(mocks.renderCard).not.toHaveBeenCalled()
    })

    it('fails for an inactive group', async () => {
        mocks.findCardGroupById.mockResolvedValue(Ok({ ...groupRow, is_active: false }))
        const result = await getPlayerCardTemplate(supabase, input)
        expect(!result.ok && result.error.message).toContain('inactive')
    })

    it('fails when the layout has no art layer', async () => {
        mocks.findCardGroupById.mockResolvedValue(Ok({ ...groupRow, layers: [username, stats] }))
        const result = await getPlayerCardTemplate(supabase, input)
        expect(!result.ok && result.error.code).toBe('VALIDATION_ERROR')
        expect(mocks.renderCard).not.toHaveBeenCalled()
    })

    it('fails when the tier has no art file', async () => {
        const missing = Err({ message: 'Tier Ruby has no art file "bg.png" in its folder', code: 'NOT_FOUND' as const })
        mocks.loadTemplateArt.mockResolvedValue(missing)
        expect(await getPlayerCardTemplate(supabase, input)).toEqual(missing)
        expect(mocks.renderCard).not.toHaveBeenCalled()
    })
})

describe('board and custom players', () => {
    beforeEach(arrange)

    it('applies overrides for a board player', async () => {
        const config = { scalings: {}, savedPositions: [], overrides: {} }
        const player = { ...subject, playerId: 'p' } as unknown as OverallInputRow
        const overrides = { username: 'STAFF' }
        mocks.getOverallConfig.mockResolvedValue(Ok(config))
        await getBoardPlayerCardTemplate(supabase, { seasonNumber: 2, groupId: 'g', player, overrides })
        expect(mocks.buildCardData).toHaveBeenCalledWith(player, config, 2, overrides)
        expect(mocks.renderCard).toHaveBeenCalledTimes(1)
    })

    it('returns a config failure for a board player', async () => {
        const failed = Err({ message: 'db', code: 'DB_ERROR' as const })
        mocks.getOverallConfig.mockResolvedValue(failed)
        const player = subject as unknown as OverallInputRow
        expect(await getBoardPlayerCardTemplate(supabase, { seasonNumber: 2, groupId: 'g', player })).toEqual(failed)
    })

    it('renders a custom player from the entered values', async () => {
        const values = { ovr: 95, position: 'SET', attributes: {} }
        const customInput = {
            seasonNumber: 2,
            regionCode: null,
            groupId: 'g',
            player: { robloxUserId: '1', username: 'Tuoasty', displayName: null, avatarUrl: null },
            values,
        } as Parameters<typeof getCustomPlayerCardTemplate>[1]
        mocks.resolveCustomSubject.mockResolvedValue(Ok(subject))
        await getCustomPlayerCardTemplate(supabase, customInput)
        expect(mocks.buildCustomCardData).toHaveBeenCalledWith(subject, values, 2)
        expect(mocks.renderCard).toHaveBeenCalledTimes(1)
    })
})
