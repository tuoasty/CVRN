import { describe, expect, it } from 'vitest'
import type { CardLayer } from '../../types'
import { tierPreviewUrl } from '../toCardShapes'

const art = (src: string): CardLayer => ({ kind: 'art', src, x: 0, y: 0, w: 10, h: 10 })
const file = (name: string) => ({ name, size: 1, url: `https://x/${name}` })

describe('tierPreviewUrl', () => {
    it('uses the first art layer when its file exists', () => {
        expect(tierPreviewUrl([art('bg.png')], [file('a.png'), file('bg.png')])).toBe('https://x/bg.png')
    })

    it('falls back to a folder file when the layout has no art layer', () => {
        expect(tierPreviewUrl([], [file('a.png')])).toBe('https://x/a.png')
    })

    it('falls back to a folder file when the expected file is missing', () => {
        expect(tierPreviewUrl([art('bg.png')], [file('a.png')])).toBe('https://x/a.png')
    })

    it('is null for an empty folder', () => {
        expect(tierPreviewUrl([art('bg.png')], [])).toBeNull()
    })
})
