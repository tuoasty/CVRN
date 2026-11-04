import { describe, expect, it } from 'vitest'
import type { CardLayer } from '@/server/domains/playerCard'
import { CARD_ART_MAX_BYTES } from '@/server/domains/playerCard/types/schemas'
import { artFitWarning, checkArtFile, checkGfxFile, checkRigFile, formatArtSize, generateBlocker, gfxBlocker, layoutArtSlots, missingArt, pickPreviewImage, readPngSize, tierHasArt, tierRangeLabels } from '../cardArt'

const art = (src: string, w = 1000, h = 1400): CardLayer => ({ kind: 'art', src, x: 0, y: 0, w, h })
const ovr: CardLayer = { kind: 'text', field: 'ovr', x: 0, y: 0, w: 1, h: 1, size: 1, color: '#fff', uppercase: false, letterSpacing: 0 }

function pngHeader(width: number, height: number) {
    const bytes = new Uint8Array(24)
    bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    bytes.set([0x49, 0x48, 0x44, 0x52], 12)
    const view = new DataView(bytes.buffer)
    view.setUint32(16, width)
    view.setUint32(20, height)
    return bytes
}

describe('layoutArtSlots', () => {
    it('lists each art file once and ignores other layers', () => {
        expect(layoutArtSlots([art('bg.png'), ovr, art('frame.png', 10, 10), art('bg.png', 5, 5)])).toEqual([
            { name: 'bg.png', w: 1000, h: 1400 },
            { name: 'frame.png', w: 10, h: 10 },
        ])
    })
})

describe('tierHasArt', () => {
    it('needs a layout art slot and its file', () => {
        expect(tierHasArt([art('bg.png')], [{ name: 'bg.png' }])).toBe(true)
        expect(tierHasArt([art('bg.png')], [])).toBe(false)
        expect(tierHasArt([ovr], [{ name: 'bg.png' }])).toBe(false)
    })
})

describe('missingArt', () => {
    it('names files the layout expects that the folder lacks', () => {
        expect(missingArt([art('bg.png'), art('frame.png')], [{ name: 'bg.png' }])).toEqual(['frame.png'])
    })

    it('is empty with no art layer', () => {
        expect(missingArt([ovr], [])).toEqual([])
    })
})

describe('artFitWarning', () => {
    const box = { w: 1000, h: 1400 }

    it('stays quiet for an exact match', () => {
        expect(artFitWarning({ width: 1000, height: 1400 }, box)).toBeNull()
    })

    it('stays quiet for larger art of the same shape', () => {
        expect(artFitWarning({ width: 2000, height: 2800 }, box)).toBeNull()
    })

    it('warns when smaller', () => {
        expect(artFitWarning({ width: 500, height: 700 }, box)).toContain('look soft')
    })

    it('warns when a different shape', () => {
        expect(artFitWarning({ width: 2000, height: 2000 }, box)).toContain('stretch')
    })

    it('warns about both for the current 819 × 1024 art', () => {
        const warning = artFitWarning({ width: 819, height: 1024 }, box)
        expect(warning).toContain('stretch')
        expect(warning).toContain('soft')
    })
})

describe('readPngSize', () => {
    it('reads width and height from the header', () => {
        expect(readPngSize(pngHeader(1000, 1400))).toEqual({ width: 1000, height: 1400 })
    })

    it('rejects a JPEG signature and short input', () => {
        const jpeg = pngHeader(1, 1)
        jpeg[0] = 0xff
        expect(readPngSize(jpeg)).toBeNull()
        expect(readPngSize(new Uint8Array(4))).toBeNull()
    })
})

describe('checkArtFile', () => {
    it('accepts a normal PNG', async () => {
        expect(await checkArtFile(new File([pngHeader(1000, 1400)], 'a.png'))).toBeNull()
    })

    it('rejects a file over the limit', async () => {
        expect(await checkArtFile(new File([new Uint8Array(CARD_ART_MAX_BYTES + 1)], 'a.png'))).toContain('2.9 MB')
    })

    it('rejects a renamed non-PNG', async () => {
        expect(await checkArtFile(new File(['not a png, just text with some length to it'], 'a.png'))).toBe('Art must be a PNG file')
    })

    it('rejects enormous dimensions', async () => {
        expect(await checkArtFile(new File([pngHeader(5000, 5000)], 'a.png'))).toContain('too large')
    })
})

describe('tierRangeLabels', () => {
    it('labels the ranges from the highest floor down', () => {
        const labels = tierRangeLabels([{ minOvr: 93 }, { minOvr: 90 }, { minOvr: 1 }]).map(t => t.label)
        expect(labels).toEqual(['93+', '90–92', '1–89'])
    })
})

describe('pickPreviewImage', () => {
    const last = { scope: 'a', image: 'old' }
    const base = { hasRequest: true, error: undefined, data: undefined, last, scope: 'a' }

    it('shows nothing with no request', () => {
        expect(pickPreviewImage({ ...base, hasRequest: false })).toBeNull()
    })

    it('shows nothing on an error, instead of an old card', () => {
        expect(pickPreviewImage({ ...base, error: new Error('x'), data: 'new' })).toBeNull()
    })

    it('prefers fresh data', () => {
        expect(pickPreviewImage({ ...base, data: 'new' })).toBe('new')
    })

    it('keeps the last image in the same group while rendering', () => {
        expect(pickPreviewImage(base)).toBe('old')
    })

    it('never shows another group\'s image', () => {
        expect(pickPreviewImage({ ...base, scope: 'b' })).toBeNull()
    })
})

describe('generateBlocker', () => {
    const base = {
        notReady: null,
        inputProblem: null,
        inactiveGroup: null,
        noTier: null,
        previewingTier: null,
        dirty: false,
        layoutProblem: null,
        layers: [art('bg.png')],
        tierName: 'Ruby',
        missing: [],
    }

    it('allows generating when everything is ready', () => {
        expect(generateBlocker(base)).toBeNull()
    })

    it('blocks with no player chosen', () => {
        expect(generateBlocker({ ...base, notReady: 'Pick a player' })).toBe('Pick a player')
    })

    it('blocks while previewing another tier', () => {
        expect(generateBlocker({ ...base, previewingTier: 'T1 Ruby' })).toContain('Previewing T1 Ruby')
    })

    it('blocks an inactive group', () => {
        expect(generateBlocker({ ...base, inactiveGroup: 'Off' })).toBe('Off')
    })

    it('blocks unsaved layout changes', () => {
        expect(generateBlocker({ ...base, dirty: true })).toContain('Save or discard')
    })

    it('blocks a layout with no art layer', () => {
        expect(generateBlocker({ ...base, layers: [ovr] })).toContain('no art layer')
    })

    it('blocks a tier missing a file and names it', () => {
        expect(generateBlocker({ ...base, missing: ['bg.png'] })).toBe('Ruby has no bg.png yet. Upload it on Card Groups.')
    })
})

describe('formatArtSize', () => {
    it('shows megabytes', () => {
        expect(formatArtSize(1.5 * 1024 * 1024)).toBe('1.50 MB')
    })
})

describe('checkGfxFile', () => {
    const canvas = { width: 1000, height: 1400 }
    const png = (width: number, height: number) => new File([pngHeader(width, height)], 'gfx.png', { type: 'image/png' })

    it('accepts a PNG at the exact canvas size', async () => {
        expect(await checkGfxFile(png(1000, 1400), canvas)).toBeNull()
    })

    it('names both sizes when it does not match', async () => {
        expect(await checkGfxFile(png(819, 1024), canvas)).toBe('GFX must be exactly 1000 × 1400. This file is 819 × 1024.')
    })

    it('rejects the right shape at the wrong size', async () => {
        expect(await checkGfxFile(png(2000, 2800), canvas)).toBe('GFX must be exactly 1000 × 1400. This file is 2000 × 2800.')
    })

    it('rejects a non-PNG', async () => {
        const jpeg = new File([new Uint8Array(24)], 'gfx.jpg', { type: 'image/jpeg' })
        expect(await checkGfxFile(jpeg, canvas)).toBe('GFX must be a PNG file')
    })

    it('rejects a file over 2.9 MB', async () => {
        const big = new File([new Uint8Array(CARD_ART_MAX_BYTES + 1)], 'gfx.png', { type: 'image/png' })
        expect(await checkGfxFile(big, canvas)).toContain('2.9 MB')
    })
})

describe('gfxBlocker', () => {
    const clear = { notReady: null, inputProblem: null, inactiveGroup: null, noTier: null, bulkRunning: null }

    it('ignores layout and art problems', () => {
        expect(gfxBlocker(clear)).toBeNull()
    })

    it('reports the bulk run first', () => {
        expect(gfxBlocker({ ...clear, notReady: 'Pick a player', noTier: 'No tier', bulkRunning: 'A bulk generation is running' })).toBe('A bulk generation is running')
    })

    it('reports each remaining problem', () => {
        expect(gfxBlocker({ ...clear, notReady: 'Pick a player' })).toBe('Pick a player')
        expect(gfxBlocker({ ...clear, inputProblem: 'Enter values' })).toBe('Enter values')
        expect(gfxBlocker({ ...clear, inactiveGroup: 'Off' })).toBe('Off')
        expect(gfxBlocker({ ...clear, noTier: 'No tier' })).toBe('No tier')
    })
})

describe('checkRigFile', () => {
    const png = (width: number, height: number) => new File([pngHeader(width, height)], 'rig.png', { type: 'image/png' })

    it('accepts a PNG of any shape', async () => {
        expect(await checkRigFile(png(819, 1024))).toBeNull()
        expect(await checkRigFile(png(3000, 2000))).toBeNull()
    })

    it('rejects enormous dimensions', async () => {
        expect(await checkRigFile(png(5000, 5000))).toBe('5000 × 5000 is too large. A rig can be up to 16 megapixels.')
    })

    it('rejects a file that is not a PNG', async () => {
        expect(await checkRigFile(new File([new Uint8Array(24)], 'rig.png'))).toBe('Rig must be a PNG file')
    })

    it('rejects a file over the limit', async () => {
        const big = new File([new Uint8Array(3 * 1024 * 1024)], 'rig.png', { type: 'image/png' })
        expect(await checkRigFile(big)).toBe('Rig must be 2.9 MB or smaller. Export a smaller PNG.')
    })
})
