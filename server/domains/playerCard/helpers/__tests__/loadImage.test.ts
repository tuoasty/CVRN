import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadImageAsPngDataUri } from '../loadImage'

const fetchMock = vi.fn()

const solid = (width: number, height: number) => sharp({ create: { width, height, channels: 4, background: '#808080' } }).png().toBuffer()
const respond = (bytes: Uint8Array, headers: Record<string, string> = {}) => new Response(new Uint8Array(bytes), { status: 200, headers })

describe('sharp settings', () => {
    it('turns the libvips operation cache off', () => {
        expect(sharp.cache().memory.max).toBe(0)
        expect(sharp.cache().items.max).toBe(0)
    })
})

describe('loadImageAsPngDataUri', () => {
    beforeEach(() => {
        fetchMock.mockReset()
        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('returns a PNG data URI and sets a timeout on the request', async () => {
        fetchMock.mockResolvedValue(respond(await solid(10, 10)))
        const result = await loadImageAsPngDataUri('https://x/a.png')
        expect(result.ok && result.value.startsWith('data:image/png;base64,')).toBe(true)
        expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
    })

    it('refuses an over-limit content-length without reading the body', async () => {
        const arrayBuffer = vi.fn()
        fetchMock.mockResolvedValue({ ok: true, status: 200, headers: new Headers({ 'content-length': String(11 * 1024 * 1024) }), arrayBuffer })
        const result = await loadImageAsPngDataUri('https://x/a.png')
        expect(!result.ok && result.error.message).toContain('10 MB')
        expect(arrayBuffer).not.toHaveBeenCalled()
    })

    it('refuses an over-limit body with no content-length', async () => {
        fetchMock.mockResolvedValue(respond(new Uint8Array(10 * 1024 * 1024 + 1)))
        const result = await loadImageAsPngDataUri('https://x/a.png')
        expect(!result.ok && result.error.message).toContain('10 MB')
    })

    it('fails cleanly when the request times out', async () => {
        fetchMock.mockRejectedValue(new DOMException('timed out', 'TimeoutError'))
        const result = await loadImageAsPngDataUri('https://x/a.png')
        expect(!result.ok && result.error.message).toBe('Failed to load card image')
    })

    it('refuses to decode enormous dimensions', async () => {
        fetchMock.mockResolvedValue(respond(await solid(5000, 5000)))
        const result = await loadImageAsPngDataUri('https://x/a.png')
        expect(result.ok).toBe(false)
    })

    it('reports a failed fetch', async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 404 }))
        const result = await loadImageAsPngDataUri('https://x/a.png')
        expect(!result.ok && result.error.message).toContain('404')
    })
})
