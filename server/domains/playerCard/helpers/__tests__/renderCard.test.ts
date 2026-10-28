import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { CardLayersSchema } from '../../types'
import type { CardData, CardTemplate } from '../../types'
import { renderCard } from '../renderCard'
import { pickTierTemplate, resolveArtLocation, resolveCardText, toCardTemplate } from '../toCardShapes'

const data: CardData = {
    username: 'spikerman',
    displayName: 'Spiker',
    ovr: 87,
    position: 'OUT',
    teamName: 'Volley Kings',
    attributes: { scoring: 90, spiking: 88, setting: 60, blocking: 72, receiving: 81, serving: 79 },
}

async function solidPng(w: number, h: number, color: string) {
    const png = await sharp({ create: { width: w, height: h, channels: 4, background: color } }).png().toBuffer()
    return `data:image/png;base64,${png.toString('base64')}`
}

describe('CardLayersSchema', () => {
    it('applies defaults to text layers', () => {
        const parsed = CardLayersSchema.parse([{ kind: 'text', field: 'ovr', x: 0, y: 0, w: 100, h: 50, size: 40 }])
        expect(parsed[0]).toMatchObject({ color: '#ffffff', statOrder: 'valueFirst', uppercase: false, letterSpacing: 0 })
    })

    it('rejects unknown fields and kinds', () => {
        expect(CardLayersSchema.safeParse([{ kind: 'text', field: 'height', x: 0, y: 0, w: 1, h: 1, size: 1 }]).success).toBe(false)
        expect(CardLayersSchema.safeParse([{ kind: 'video', x: 0, y: 0, w: 1, h: 1 }]).success).toBe(false)
        expect(CardLayersSchema.safeParse([]).success).toBe(false)
    })

    it('requires text on custom text layers and drops the old align key', () => {
        expect(CardLayersSchema.safeParse([{ kind: 'text', field: 'custom', x: 0, y: 0, w: 1, h: 1, size: 1 }]).success).toBe(false)
        expect(CardLayersSchema.safeParse([{ kind: 'text', field: 'custom', text: '  ', x: 0, y: 0, w: 1, h: 1, size: 1 }]).success).toBe(false)
        const parsed = CardLayersSchema.parse([{ kind: 'text', field: 'ovr', align: 'left', x: 0, y: 0, w: 1, h: 1, size: 1 }])
        expect(parsed[0]).not.toHaveProperty('align')
    })

    it('toCardTemplate surfaces a VALIDATION_ERROR for a bad manual insert', () => {
        const result = toCardTemplate({
            id: 't', name: 'Bad', canvas_width: 10, canvas_height: 10, group_id: 'g', tier: 1, min_ovr: 1,
            created_at: '', fonts: [], layers: [{ kind: 'text', field: 'ovr' }],
        }, 'base')
        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR')
    })
})

describe('pickTierTemplate', () => {
    const tiers = [
        { tier: 3, minOvr: 1 },
        { tier: 1, minOvr: 85 },
        { tier: 2, minOvr: 70 },
    ]

    it('picks the highest tier whose floor the OVR reaches', () => {
        expect(pickTierTemplate(tiers, 99)?.tier).toBe(1)
        expect(pickTierTemplate(tiers, 85)?.tier).toBe(1)
        expect(pickTierTemplate(tiers, 84)?.tier).toBe(2)
        expect(pickTierTemplate(tiers, 70)?.tier).toBe(2)
        expect(pickTierTemplate(tiers, 45)?.tier).toBe(3)
    })

    it('returns null when no tier covers the OVR', () => {
        expect(pickTierTemplate([{ tier: 1, minOvr: 90 }], 89)).toBeNull()
        expect(pickTierTemplate([], 99)).toBeNull()
    })
})

describe('resolveArtLocation', () => {
    it('puts bare file names in the group tier folder', () => {
        expect(resolveArtLocation('bg.png', 'halloween', 2)).toEqual({ path: 'card-templates/halloween/2/bg.png' })
    })

    it('keeps explicit storage paths and URLs', () => {
        expect(resolveArtLocation('shared/frame.png', 'base', 1)).toEqual({ path: 'shared/frame.png' })
        expect(resolveArtLocation('https://cdn.example.com/a.png', 'base', 1)).toEqual({ url: 'https://cdn.example.com/a.png' })
    })
})

describe('resolveCardText', () => {
    const base = { kind: 'text' as const, x: 0, y: 0, w: 1, h: 1, size: 1, color: '#fff', statOrder: 'valueFirst' as const, letterSpacing: 0 }

    it('maps fields and uppercases on request', () => {
        expect(resolveCardText({ ...base, field: 'ovr', uppercase: false }, data)).toBe('87')
        expect(resolveCardText({ ...base, field: 'blocking', uppercase: false }, data)).toBe('72 BLK')
        expect(resolveCardText({ ...base, field: 'username', uppercase: true }, data)).toBe('SPIKERMAN')
    })

    it('flips stat order and prints custom text', () => {
        expect(resolveCardText({ ...base, field: 'spiking', uppercase: false, statOrder: 'labelFirst' }, data)).toBe('SPK 88')
        expect(resolveCardText({ ...base, field: 'custom', text: 'OVR', uppercase: false }, data)).toBe('OVR')
    })

    it('falls back to username when display name is missing', () => {
        expect(resolveCardText({ ...base, field: 'displayName', uppercase: false }, { ...data, displayName: null })).toBe('spikerman')
    })
})

describe('renderCard', () => {
    it('renders a PNG at the template canvas size', async () => {
        const template: CardTemplate = {
            id: 't',
            groupId: 'g',
            groupSlug: 'base',
            tier: 1,
            minOvr: 1,
            name: 'Test',
            width: 500,
            height: 700,
            layers: CardLayersSchema.parse([
                { kind: 'art', src: 'bg', x: 0, y: 0, w: 500, h: 700 },
                { kind: 'image', field: 'headshot', x: 100, y: 100, w: 300, h: 300, fit: 'cover' },
                { kind: 'image', field: 'teamLogo', x: 20, y: 20, w: 60, h: 60 },
                { kind: 'text', field: 'ovr', x: 20, y: 100, w: 80, h: 60, size: 48 },
                { kind: 'text', field: 'username', x: 0, y: 420, w: 500, h: 50, size: 36, align: 'center', uppercase: true },
                { kind: 'text', field: 'scoring', x: 40, y: 500, w: 60, h: 30, size: 24 },
            ]),
        }
        const png = await renderCard(template, data, {
            art: { bg: await solidPng(500, 700, '#101010') },
            headshot: await solidPng(420, 420, '#3355ff'),
            teamLogo: null,
        })
        const meta = await sharp(png).metadata()
        expect(meta.format).toBe('png')
        expect(meta.width).toBe(500)
        expect(meta.height).toBe(700)
    }, 30000)
})
