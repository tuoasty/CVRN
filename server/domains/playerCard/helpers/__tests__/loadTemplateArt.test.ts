import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Err, Ok } from '@/shared/types/result'
import type { CardTemplate } from '../../types'
import { loadTemplateArt } from '../loadTemplateArt'

const mocks = vi.hoisted(() => ({
    loadImageCached: vi.fn(),
    loadImageAsPngDataUri: vi.fn(),
    resolveTemplateArtUrls: vi.fn(),
}))

vi.mock('../loadImage', () => ({
    loadImageCached: mocks.loadImageCached,
    loadImageAsPngDataUri: mocks.loadImageAsPngDataUri,
}))
vi.mock('../templateArtStorage', () => ({ resolveTemplateArtUrls: mocks.resolveTemplateArtUrls }))

const template: CardTemplate = {
    id: 't',
    groupId: 'g',
    name: 'Ruby',
    minOvr: 90,
    width: 100,
    height: 100,
    layers: [
        { kind: 'art', src: 'bg.png', x: 0, y: 0, w: 100, h: 100 },
        { kind: 'art', src: 'frame.png', x: 0, y: 0, w: 100, h: 100 },
    ],
}

describe('loadTemplateArt', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mocks.loadImageCached.mockResolvedValue(Ok('cached-uri'))
        mocks.loadImageAsPngDataUri.mockResolvedValue(Ok('fresh-uri'))
    })

    it('skips a missing file when allowed', async () => {
        mocks.resolveTemplateArtUrls.mockResolvedValue(Ok({ 'bg.png': 'https://x/bg.png', 'frame.png': null }))
        const result = await loadTemplateArt(template, { cached: true, allowMissing: true })
        expect(result).toEqual(Ok({ 'bg.png': 'cached-uri' }))
    })

    it('returns NOT_FOUND for a missing file when not allowed', async () => {
        mocks.resolveTemplateArtUrls.mockResolvedValue(Ok({ 'bg.png': 'https://x/bg.png', 'frame.png': null }))
        const result = await loadTemplateArt(template, { cached: false, allowMissing: false })
        expect(!result.ok && result.error.code).toBe('NOT_FOUND')
        expect(!result.ok && result.error.message).toContain('frame.png')
    })

    it.each([true, false])('errors on a failed fetch with allowMissing %s', async allowMissing => {
        mocks.resolveTemplateArtUrls.mockResolvedValue(Ok({ 'bg.png': 'https://x/bg.png', 'frame.png': 'https://x/frame.png' }))
        mocks.loadImageCached.mockResolvedValue(Err({ message: 'down', code: 'INTEGRATION_ERROR' }))
        const result = await loadTemplateArt(template, { cached: true, allowMissing })
        expect(!result.ok && result.error.code).toBe('INTEGRATION_ERROR')
    })
})
