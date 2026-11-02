import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { inspectCardArt } from '../inspectCardArt'

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
