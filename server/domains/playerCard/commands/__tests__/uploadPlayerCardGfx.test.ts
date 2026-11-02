import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Err, Ok } from '@/shared/types/result'
import type { DBClient } from '@/shared/types/db'
import { CARD_ART_MAX_BYTES } from '../../types'
import type { CardData, CardSubject } from '../../types'
import { uploadPlayerCardGfx } from '../uploadPlayerCardGfx'

const mocks = vi.hoisted(() => ({
    resolveCardTier: vi.fn(),
    inspectCardArt: vi.fn(),
    saveCardImage: vi.fn(),
    renderCard: vi.fn(),
    getRobloxLargeHeadshot: vi.fn(),
}))

vi.mock('../../helpers/resolveCardTier', () => ({ resolveCardTier: mocks.resolveCardTier }))
vi.mock('../../helpers/inspectCardArt', () => ({ inspectCardArt: mocks.inspectCardArt }))
vi.mock('../../helpers/saveCardImage', () => ({ saveCardImage: mocks.saveCardImage }))
vi.mock('../../helpers/renderCard', () => ({ renderCard: mocks.renderCard }))
vi.mock('@/server/roblox/users', () => ({ getRobloxLargeHeadshot: mocks.getRobloxLargeHeadshot }))

const supabase = {} as DBClient
const saved = { playerId: 'p' }
const bytes = new Uint8Array([1, 2, 3, 4])
const subject = { robloxUserId: '1', teamId: null } as CardSubject
const data = { ovr: 88, position: null, attributes: {} } as unknown as CardData
const ensurePlayerId = async () => Ok('p')
const input = (file = new File([bytes], 'gfx.png', { type: 'image/png' })) => ({
    seasonNumber: 3,
    groupId: 'g',
    subject,
    data,
    file,
    ensurePlayerId,
})

describe('uploadPlayerCardGfx', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mocks.resolveCardTier.mockResolvedValue(Ok({
            group: { id: 'g', canvas_width: 1000, canvas_height: 1400 },
            tier: { id: 'ruby' },
        }))
        mocks.inspectCardArt.mockResolvedValue(Ok({ width: 1000, height: 1400 }))
        mocks.saveCardImage.mockResolvedValue(Ok(saved))
    })

    it('stores the exact uploaded bytes', async () => {
        expect(await uploadPlayerCardGfx(supabase, input())).toEqual(Ok(saved))
        const png = mocks.saveCardImage.mock.calls[0][1].png
        expect(Buffer.isBuffer(png)).toBe(true)
        expect([...png]).toEqual([...bytes])
    })

    it('rejects the right shape at the wrong size', async () => {
        mocks.inspectCardArt.mockResolvedValue(Ok({ width: 2000, height: 2800 }))
        const result = await uploadPlayerCardGfx(supabase, input())
        expect(!result.ok && result.error.message).toBe('GFX must be exactly 1000 × 1400. This file is 2000 × 2800.')
        expect(!result.ok && result.error.code).toBe('VALIDATION_ERROR')
        expect(mocks.saveCardImage).not.toHaveBeenCalled()
    })

    it('rejects a smaller file', async () => {
        mocks.inspectCardArt.mockResolvedValue(Ok({ width: 819, height: 1024 }))
        const result = await uploadPlayerCardGfx(supabase, input())
        expect(!result.ok && result.error.message).toBe('GFX must be exactly 1000 × 1400. This file is 819 × 1024.')
        expect(mocks.saveCardImage).not.toHaveBeenCalled()
    })

    it('rejects a file over 2.9 MB before reading it', async () => {
        const big = new File([new Uint8Array(CARD_ART_MAX_BYTES + 1)], 'gfx.png', { type: 'image/png' })
        const result = await uploadPlayerCardGfx(supabase, input(big))
        expect(!result.ok && result.error.code).toBe('VALIDATION_ERROR')
        expect(!result.ok && result.error.message).toContain('2.9 MB')
        expect(mocks.inspectCardArt).not.toHaveBeenCalled()
        expect(mocks.saveCardImage).not.toHaveBeenCalled()
    })

    it('rejects a non-PNG', async () => {
        const notPng = Err({ message: 'Art must be a PNG file', code: 'VALIDATION_ERROR' as const })
        mocks.inspectCardArt.mockResolvedValue(notPng)
        expect(await uploadPlayerCardGfx(supabase, input())).toEqual(notPng)
        expect(mocks.saveCardImage).not.toHaveBeenCalled()
    })

    it('uses the tier for the data OVR', async () => {
        await uploadPlayerCardGfx(supabase, input())
        expect(mocks.resolveCardTier).toHaveBeenCalledWith(supabase, { groupId: 'g', ovr: 88 })
        expect(mocks.saveCardImage.mock.calls[0][1]).toMatchObject({
            seasonNumber: 3,
            groupId: 'g',
            templateId: 'ruby',
            subject,
            data,
            ensurePlayerId,
        })
    })

    it('rejects an inactive group or a missing tier', async () => {
        const inactive = Err({ message: 'Base is inactive', code: 'VALIDATION_ERROR' as const })
        mocks.resolveCardTier.mockResolvedValue(inactive)
        expect(await uploadPlayerCardGfx(supabase, input())).toEqual(inactive)
        expect(mocks.saveCardImage).not.toHaveBeenCalled()
    })

    it('never renders or fetches Roblox', async () => {
        await uploadPlayerCardGfx(supabase, input())
        expect(mocks.renderCard).not.toHaveBeenCalled()
        expect(mocks.getRobloxLargeHeadshot).not.toHaveBeenCalled()
    })
})
