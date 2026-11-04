import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { inspectCardArt, isFullyOpaque } from '../inspectCardArt'

const solid = (width: number, height: number) => sharp({ create: { width, height, channels: 4, background: '#123456' } })

describe('inspectCardArt', () => {
    it('reads the size of a real PNG', async () => {
        const result = await inspectCardArt(await solid(1000, 1400).png().toBuffer())
        expect(result.ok && result.value).toEqual({ width: 1000, height: 1400 })
    })

    it('rejects JPEG bytes, whatever the file is called', async () => {
        const result = await inspectCardArt(await solid(100, 100).jpeg().toBuffer())
        expect(!result.ok && result.error.message).toBe('Art must be a PNG file')
    })

    it('rejects enormous dimensions in a small file', async () => {
        const bytes = await solid(5000, 5000).png().toBuffer()
        expect(bytes.length).toBeLessThan(3 * 1024 * 1024)
        const result = await inspectCardArt(bytes)
        expect(!result.ok && result.error.message).toContain('too large')
    })

    it('rejects bytes that are not an image', async () => {
        const result = await inspectCardArt(Buffer.from('not an image'))
        expect(!result.ok && result.error.code).toBe('VALIDATION_ERROR')
    })
})

describe('isFullyOpaque', () => {
    const png = (channels: 3 | 4, background: { r: number; g: number; b: number; alpha?: number }) =>
        sharp({ create: { width: 20, height: 20, channels, background } }).png().toBuffer()

    it('is false for a PNG with transparent pixels', async () => {
        expect(await isFullyOpaque(await png(4, { r: 0, g: 0, b: 0, alpha: 0 }))).toBe(false)
    })

    it('is true for a PNG with an alpha channel and no transparent pixels', async () => {
        expect(await isFullyOpaque(await png(4, { r: 10, g: 20, b: 30, alpha: 1 }))).toBe(true)
    })

    it('is true for a PNG with no alpha channel', async () => {
        expect(await isFullyOpaque(await png(3, { r: 10, g: 20, b: 30 }))).toBe(true)
    })
})
