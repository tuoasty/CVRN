import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const list = vi.fn()
const remove = vi.fn()

vi.mock('@/server/supabase/admin', () => ({
    getSupabaseAdmin: () => ({
        storage: {
            from: () => ({
                list,
                remove,
                getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${path}` } }),
            }),
        },
    }),
}))

vi.mock('@/server/storage/toCdnUrl', () => ({ toCdnUrl: (url: string) => url }))

const file = (name: string, updated_at = '2026-11-02T00:00:00.000Z') => ({ id: name, name, updated_at, metadata: { size: 1 } })

describe('template art listing cache', () => {
    let storage: typeof import('../templateArtStorage')

    beforeEach(async () => {
        vi.resetModules()
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-11-02T00:00:00.000Z'))
        list.mockReset()
        remove.mockReset()
        list.mockResolvedValue({ data: [file('bg.png')], error: null })
        remove.mockResolvedValue({ error: null })
        storage = await import('../templateArtStorage')
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('lists once for repeated cached lookups', async () => {
        const first = await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        const second = await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        expect(list).toHaveBeenCalledTimes(1)
        expect(second).toEqual(first)
    })

    it('keeps tiers separate', async () => {
        await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        await storage.resolveTemplateArtUrls('t2', ['bg.png'], { cached: true })
        expect(list).toHaveBeenCalledTimes(2)
    })

    it('keeps a listing for 30 days, then lists again', async () => {
        const thirtyDays = 30 * 24 * 60 * 60 * 1000
        await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        vi.advanceTimersByTime(thirtyDays - 1)
        await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        expect(list).toHaveBeenCalledTimes(1)
        vi.advanceTimersByTime(1)
        await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        expect(list).toHaveBeenCalledTimes(2)
    })

    it('always lists fresh when not cached, and shares the result with later cached reads', async () => {
        await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        list.mockResolvedValue({ data: [file('bg.png', '2026-11-02T00:00:05.000Z')], error: null })
        const fresh = await storage.resolveTemplateArtUrls('t1', ['bg.png'])
        const cached = await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        expect(list).toHaveBeenCalledTimes(2)
        expect(cached).toEqual(fresh)
    })

    it('rechecks storage when a cached listing is missing the file', async () => {
        list.mockResolvedValueOnce({ data: [], error: null })
        const missing = await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        const found = await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        expect(missing.ok && missing.value['bg.png']).toBeNull()
        expect(found.ok && found.value['bg.png']).toBeTruthy()
        expect(list).toHaveBeenCalledTimes(2)
    })

    it('does not cache a failed listing', async () => {
        list.mockResolvedValueOnce({ data: null, error: new Error('down') })
        const failed = await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        const retried = await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        expect(failed.ok).toBe(false)
        expect(retried.ok).toBe(true)
    })

    it('serves the new version after a listing is forgotten and re-read', async () => {
        const before = await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        list.mockResolvedValue({ data: [file('bg.png', '2026-11-02T00:00:05.000Z')], error: null })
        storage.forgetTemplateArtListing('t1')
        await storage.listTemplateArtFiles('t1')
        const after = await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        expect(after.ok && after.value['bg.png']).not.toEqual(before.ok && before.value['bg.png'])
        expect(list).toHaveBeenCalledTimes(2)
    })

    it('lists art with versioned urls and sizes', async () => {
        const art = await storage.listTemplateArt('t1')
        expect(art.ok && art.value).toEqual([{
            name: 'bg.png',
            size: 1,
            url: `https://storage.test/card-templates/t1/bg.png?v=${Date.parse('2026-11-02T00:00:00.000Z')}`,
        }])
    })

    it('forgets a listing when the tier folder is removed', async () => {
        await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        await storage.removeTemplateArtFolder('t1')
        list.mockResolvedValue({ data: [], error: null })
        const after = await storage.resolveTemplateArtUrls('t1', ['bg.png'], { cached: true })
        expect(after.ok && after.value['bg.png']).toBeNull()
    })
})
