import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Err, Ok } from '@/shared/types/result'
import type { DBClient } from '@/shared/types/db'
import { CARD_ART_MAX_BYTES } from '../../types'
import { uploadCardTemplateArt } from '../uploadCardTemplateArt'

const mocks = vi.hoisted(() => ({
    uploadFile: vi.fn(),
    findCardTemplateById: vi.fn(),
    forgetTemplateArtListing: vi.fn(),
    listTemplateArtFiles: vi.fn(),
}))

vi.mock('@/server/storage/storage.service', () => ({ uploadFile: mocks.uploadFile }))
vi.mock('@/server/db/playerCards.repo', () => ({ findCardTemplateById: mocks.findCardTemplateById }))
vi.mock('../../helpers/templateArtStorage', () => ({
    forgetTemplateArtListing: mocks.forgetTemplateArtListing,
    listTemplateArtFiles: mocks.listTemplateArtFiles,
}))

const admin = {} as DBClient
const TIER = '22222222-2222-4222-8222-222222222222'

async function pngFile(name = 'art.png') {
    const bytes = await sharp({ create: { width: 1000, height: 1400, channels: 4, background: '#123456' } }).png().toBuffer()
    return new File([new Uint8Array(bytes)], name, { type: 'image/png' })
}

describe('uploadCardTemplateArt', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        mocks.findCardTemplateById.mockResolvedValue(Ok({ id: TIER }))
        mocks.uploadFile.mockResolvedValue(Ok({ url: 'u', path: 'p', bgRemoved: false }))
        mocks.listTemplateArtFiles.mockResolvedValue(Ok([]))
    })

    it('stores the original bytes under the tier folder, with no compression', async () => {
        const file = await pngFile()
        const result = await uploadCardTemplateArt(admin, { templateId: TIER, fileName: 'bg.png', file, userId: 'me' })
        expect(result.ok && result.value).toEqual({ width: 1000, height: 1400 })
        expect(mocks.uploadFile).toHaveBeenCalledWith(admin, expect.objectContaining({
            path: `card-templates/${TIER}/bg.png`,
            file,
            compress: false,
            upsert: true,
            contentType: 'image/png',
        }))
    })

    it('forgets the cached listing before listing again, so a replacement gets a new version', async () => {
        await uploadCardTemplateArt(admin, { templateId: TIER, fileName: 'bg.png', file: await pngFile(), userId: 'me' })
        const forgot = mocks.forgetTemplateArtListing.mock.invocationCallOrder[0]
        const listed = mocks.listTemplateArtFiles.mock.invocationCallOrder[0]
        const uploaded = mocks.uploadFile.mock.invocationCallOrder[0]
        expect(uploaded).toBeLessThan(forgot)
        expect(forgot).toBeLessThan(listed)
    })

    it.each(['https://x/y.png', 'a/b.png', '../x.png', 'x.jpg', 'x'])('rejects the file name %s', async fileName => {
        const result = await uploadCardTemplateArt(admin, { templateId: TIER, fileName, file: await pngFile(), userId: 'me' })
        expect(!result.ok && result.error.code).toBe('VALIDATION_ERROR')
        expect(mocks.uploadFile).not.toHaveBeenCalled()
    })

    it('rejects a file over the limit instead of shrinking it', async () => {
        const file = new File([new Uint8Array(CARD_ART_MAX_BYTES + 1)], 'big.png', { type: 'image/png' })
        const result = await uploadCardTemplateArt(admin, { templateId: TIER, fileName: 'bg.png', file, userId: 'me' })
        expect(!result.ok && result.error.message).toContain('2.9 MB')
        expect(mocks.uploadFile).not.toHaveBeenCalled()
    })

    it('rejects an unknown tier', async () => {
        mocks.findCardTemplateById.mockResolvedValue(Ok(null))
        const result = await uploadCardTemplateArt(admin, { templateId: TIER, fileName: 'bg.png', file: await pngFile(), userId: 'me' })
        expect(!result.ok && result.error.code).toBe('NOT_FOUND')
        expect(mocks.uploadFile).not.toHaveBeenCalled()
    })

    it('rejects a JPEG named .png', async () => {
        const bytes = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).jpeg().toBuffer()
        const file = new File([new Uint8Array(bytes)], 'fake.png', { type: 'image/png' })
        const result = await uploadCardTemplateArt(admin, { templateId: TIER, fileName: 'bg.png', file, userId: 'me' })
        expect(!result.ok && result.error.message).toBe('Art must be a PNG file')
        expect(mocks.uploadFile).not.toHaveBeenCalled()
    })

    it('still succeeds when the relist fails, because the file is stored', async () => {
        mocks.listTemplateArtFiles.mockResolvedValue(Err({ message: 'down', code: 'INTEGRATION_ERROR' }))
        const result = await uploadCardTemplateArt(admin, { templateId: TIER, fileName: 'bg.png', file: await pngFile(), userId: 'me' })
        expect(result.ok).toBe(true)
        expect(mocks.forgetTemplateArtListing).toHaveBeenCalledWith(TIER)
    })
})
