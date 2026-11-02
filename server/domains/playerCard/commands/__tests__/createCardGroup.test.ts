import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Ok } from '@/shared/types/result'
import type { DBClient } from '@/shared/types/db'
import { CreateCardGroupSchema, CreateCardTemplateSchema, UpdateCardGroupSchema } from '../../types'
import { createCardGroup } from '../createCardGroup'

const repo = vi.hoisted(() => ({
    findCardGroupById: vi.fn(),
    findCardGroups: vi.fn(),
    insertCardGroup: vi.fn(),
}))

vi.mock('@/server/db/playerCards.repo', () => repo)

const supabase = {} as DBClient
const SOURCE_ID = '11111111-1111-4111-8111-111111111111'
const layers = [{ kind: 'art', src: 'bg.png', x: 0, y: 0, w: 800, h: 1200 }]
const sourceRow = { id: SOURCE_ID, name: 'Base', canvas_width: 800, canvas_height: 1200, layers }
const input = { name: 'Holiday', isActive: true, sortOrder: 2, sourceGroupId: SOURCE_ID }

describe('createCardGroup', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        repo.insertCardGroup.mockResolvedValue(Ok({ id: 'new' }))
    })

    it('copies the full layout and canvas from the source', async () => {
        repo.findCardGroupById.mockResolvedValue(Ok(sourceRow))
        const result = await createCardGroup(supabase, input)
        expect(result).toEqual(Ok({ id: 'new' }))
        expect(repo.insertCardGroup).toHaveBeenCalledWith(supabase, expect.objectContaining({
            name: 'Holiday',
            is_active: true,
            sort_order: 2,
            layers: expect.arrayContaining([expect.objectContaining({ kind: 'art', src: 'bg.png', w: 800, h: 1200 })]),
            canvas_width: 800,
            canvas_height: 1200,
        }))
    })

    it('returns NOT_FOUND when the source is gone', async () => {
        repo.findCardGroupById.mockResolvedValue(Ok(null))
        const result = await createCardGroup(supabase, input)
        expect(!result.ok && result.error.code).toBe('NOT_FOUND')
        expect(repo.insertCardGroup).not.toHaveBeenCalled()
    })

    it('inserts nothing when the source has an invalid layout', async () => {
        repo.findCardGroupById.mockResolvedValue(Ok({ ...sourceRow, layers: [{ kind: 'text', field: 'ovr' }] }))
        const result = await createCardGroup(supabase, input)
        expect(!result.ok && result.error.code).toBe('VALIDATION_ERROR')
        expect(repo.insertCardGroup).not.toHaveBeenCalled()
    })

    it.each([
        ['empty', []],
        ['art-less', [{ kind: 'text', field: 'ovr', x: 0, y: 0, w: 1, h: 1, size: 1 }]],
        ['art-on-top', [{ kind: 'text', field: 'ovr', x: 0, y: 0, w: 1, h: 1, size: 1 }, layers[0]]],
    ])('refuses to copy an %s layout, because the new group could never get art', async (_label, sourceLayers) => {
        repo.findCardGroupById.mockResolvedValue(Ok({ ...sourceRow, layers: sourceLayers }))
        const result = await createCardGroup(supabase, input)
        expect(!result.ok && result.error.message).toContain('no art layer')
        expect(repo.insertCardGroup).not.toHaveBeenCalled()
    })

    it('requires a source while groups exist', async () => {
        repo.findCardGroups.mockResolvedValue(Ok([sourceRow]))
        const result = await createCardGroup(supabase, { ...input, sourceGroupId: null })
        expect(!result.ok && result.error.code).toBe('VALIDATION_ERROR')
        expect(repo.insertCardGroup).not.toHaveBeenCalled()
    })

    it('starts the very first group with a full-canvas art layer', async () => {
        repo.findCardGroups.mockResolvedValue(Ok([]))
        const result = await createCardGroup(supabase, { ...input, sourceGroupId: null })
        expect(result.ok).toBe(true)
        expect(repo.insertCardGroup).toHaveBeenCalledWith(supabase, expect.objectContaining({
            layers: [{ kind: 'art', src: 'bg.png', x: 0, y: 0, w: 1000, h: 1400 }],
            canvas_width: 1000,
            canvas_height: 1400,
        }))
    })
})

describe('card group form validation', () => {
    const message = (parsed: { success: boolean; error?: { issues: { message: string }[] } }) => parsed.error?.issues[0]?.message

    it('gives readable errors for blank number fields', () => {
        expect(message(CreateCardGroupSchema.safeParse({ ...input, sortOrder: NaN }))).toBe('Order must be a number')
        expect(message(UpdateCardGroupSchema.safeParse({ groupId: SOURCE_ID, name: 'x', isActive: true, sortOrder: 1, width: NaN, height: 1400 }))).toBe('Canvas sides must be numbers')
        expect(message(CreateCardTemplateSchema.safeParse({ groupId: SOURCE_ID, name: 'x', minOvr: NaN }))).toBe('Floor must be between 1 and 99')
    })
})
