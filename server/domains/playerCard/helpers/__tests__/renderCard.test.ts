import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { CardLayersSchema } from '../../types'
import type { CardData, CardTemplate } from '../../types'
import { renderCard } from '../renderCard'
import { fontKeyForField } from '../cardFont'
import { loadTestFonts } from './testFonts'
import { ladderProblem, pickTierTemplate, rankTemplates, resolveArtLocation, resolveCardText, statCellText, toCardTemplate, withArtVersion } from '../toCardShapes'

const data: CardData = {
    username: 'spikerman',
    displayName: 'Spiker',
    ovr: 87,
    position: 'OUT',
    teamName: 'Volley Kings',
    season: 'NA S2',
    attributes: { scoring: 90, spiking: 88, setting: 60, blocking: 72, receiving: 81, serving: 79 },
}

async function solidPng(w: number, h: number, color: string) {
    const png = await sharp({ create: { width: w, height: h, channels: 4, background: color } }).png().toBuffer()
    return `data:image/png;base64,${png.toString('base64')}`
}

describe('CardLayersSchema', () => {
    it('applies defaults to text layers', () => {
        const parsed = CardLayersSchema.parse([{ kind: 'text', field: 'ovr', x: 0, y: 0, w: 100, h: 50, size: 40 }])
        expect(parsed[0]).toMatchObject({ color: '#ffffff', uppercase: false, letterSpacing: 0 })
    })

    it('rejects unknown fields and kinds', () => {
        expect(CardLayersSchema.safeParse([{ kind: 'text', field: 'height', x: 0, y: 0, w: 1, h: 1, size: 1 }]).success).toBe(false)
        expect(CardLayersSchema.safeParse([{ kind: 'video', x: 0, y: 0, w: 1, h: 1 }]).success).toBe(false)
        expect(CardLayersSchema.safeParse([]).success).toBe(false)
    })

    it('accepts a stats block and rejects the old per-stat text layers', () => {
        const parsed = CardLayersSchema.parse([{ kind: 'stats', x: 0, y: 0, w: 300, h: 120, size: 30 }])
        expect(parsed[0]).toMatchObject({ kind: 'stats', color: '#ffffff', letterSpacing: 0 })
        expect(CardLayersSchema.safeParse([{ kind: 'text', field: 'scoring', x: 0, y: 0, w: 1, h: 1, size: 1 }]).success).toBe(false)
    })

    it('requires text on custom text layers and drops the old align key', () => {
        expect(CardLayersSchema.safeParse([{ kind: 'text', field: 'custom', x: 0, y: 0, w: 1, h: 1, size: 1 }]).success).toBe(false)
        expect(CardLayersSchema.safeParse([{ kind: 'text', field: 'custom', text: '  ', x: 0, y: 0, w: 1, h: 1, size: 1 }]).success).toBe(false)
        const parsed = CardLayersSchema.parse([{ kind: 'text', field: 'ovr', align: 'left', x: 0, y: 0, w: 1, h: 1, size: 1 }])
        expect(parsed[0]).not.toHaveProperty('align')
    })

    const tier = { id: 't', name: 'Gold', group_id: 'g', min_ovr: 85, created_at: '' }
    const group = {
        id: 'g', name: 'Base', is_limited: false, is_active: true, sort_order: 0, created_at: '',
        canvas_width: 500, canvas_height: 700,
    }

    it('toCardTemplate surfaces a VALIDATION_ERROR for a bad group layout', () => {
        const result = toCardTemplate(tier, { ...group, layers: [{ kind: 'text', field: 'ovr' }] })
        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR')
    })

    it('toCardTemplate takes the layout and canvas from the group and the art folder from the tier', () => {
        const result = toCardTemplate(tier, { ...group, layers: [{ kind: 'art', src: 'bg.png', x: 0, y: 0, w: 500, h: 700 }] })
        expect(result.ok && { id: result.value.id, width: result.value.width, height: result.value.height, layers: result.value.layers.length })
            .toEqual({ id: 't', width: 500, height: 700, layers: 1 })
    })
})

describe('pickTierTemplate', () => {
    const tiers = [
        { name: 'bronze', minOvr: 1 },
        { name: 'gold', minOvr: 85 },
        { name: 'silver', minOvr: 70 },
    ]

    it('picks the highest floor the OVR reaches, whatever the input order', () => {
        expect(pickTierTemplate(tiers, 99)?.name).toBe('gold')
        expect(pickTierTemplate(tiers, 85)?.name).toBe('gold')
        expect(pickTierTemplate(tiers, 84)?.name).toBe('silver')
        expect(pickTierTemplate(tiers, 70)?.name).toBe('silver')
        expect(pickTierTemplate(tiers, 45)?.name).toBe('bronze')
    })

    it('returns null when no tier covers the OVR', () => {
        expect(pickTierTemplate([{ minOvr: 90 }], 89)).toBeNull()
        expect(pickTierTemplate([], 99)).toBeNull()
    })
})

describe('rankTemplates', () => {
    it('ranks by floor, highest floor first', () => {
        const ranked = rankTemplates([{ id: 'b', minOvr: 1 }, { id: 'g', minOvr: 85 }, { id: 's', minOvr: 70 }])
        expect(ranked.map(t => [t.id, t.rank])).toEqual([['g', 1], ['s', 2], ['b', 3]])
    })
})

describe('ladderProblem', () => {
    it('passes when the lowest floor is 1', () => {
        expect(ladderProblem([{ minOvr: 1 }])).toBeNull()
        expect(ladderProblem([{ minOvr: 90 }, { minOvr: 1 }])).toBeNull()
    })

    it('names the uncovered OVR range', () => {
        expect(ladderProblem([{ minOvr: 90 }, { minOvr: 40 }])).toBe("OVR 1–39 has no card. Set the lowest tier's floor to 1.")
        expect(ladderProblem([{ minOvr: 2 }])).toBe("OVR 1 has no card. Set the lowest tier's floor to 1.")
    })

    it('flags a group without tiers', () => {
        expect(ladderProblem([])).toBe('No tiers')
    })
})

describe('resolveArtLocation', () => {
    it('puts bare file names in the template folder', () => {
        expect(resolveArtLocation('bg.png', 'tpl-1')).toEqual({ path: 'card-templates/tpl-1/bg.png' })
    })

    it('keeps explicit storage paths and URLs', () => {
        expect(resolveArtLocation('shared/frame.png', 'tpl-1')).toEqual({ path: 'shared/frame.png' })
        expect(resolveArtLocation('https://cdn.example.com/a.png', 'tpl-1')).toEqual({ url: 'https://cdn.example.com/a.png' })
    })
})

describe('withArtVersion', () => {
    it('appends the file version as a cache buster', () => {
        expect(withArtVersion('https://cdn.example.com/a.png', 123)).toBe('https://cdn.example.com/a.png?v=123')
        expect(withArtVersion('https://cdn.example.com/a.png?x=1', 123)).toBe('https://cdn.example.com/a.png?x=1&v=123')
        expect(withArtVersion('https://cdn.example.com/a.png', undefined)).toBe('https://cdn.example.com/a.png')
    })
})

describe('resolveCardText', () => {
    const base = { kind: 'text' as const, x: 0, y: 0, w: 1, h: 1, size: 1, color: '#fff', letterSpacing: 0 }

    it('maps fields and uppercases on request', () => {
        expect(resolveCardText({ ...base, field: 'ovr', uppercase: false }, data)).toBe('87')
        expect(resolveCardText({ ...base, field: 'username', uppercase: true }, data)).toBe('SPIKERMAN')
    })

    it('prints custom text and stat cells as value then label', () => {
        expect(resolveCardText({ ...base, field: 'custom', text: 'OVR', uppercase: false }, data)).toBe('OVR')
        expect(statCellText('blocking', data)).toBe('72 BLK')
        expect(statCellText('spiking', data)).toBe('88 SPK')
    })

    it('falls back to username when display name is missing', () => {
        expect(resolveCardText({ ...base, field: 'displayName', uppercase: false }, { ...data, displayName: null })).toBe('spikerman')
    })
})

describe('fontKeyForField', () => {
    it('uses Bebas for names, Teko for OVR and TT Norms for everything else', () => {
        expect(fontKeyForField('username')).toBe('bebas')
        expect(fontKeyForField('displayName')).toBe('bebas')
        expect(fontKeyForField('ovr')).toBe('teko')
        expect(fontKeyForField('position')).toBe('norms')
        expect(fontKeyForField('custom')).toBe('norms')
    })
})

describe('renderCard', () => {
    it('renders a PNG at the template canvas size', async () => {
        const template: CardTemplate = {
            id: 't',
            groupId: 'g',
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
                { kind: 'stats', x: 40, y: 500, w: 420, h: 150, size: 30 },
            ]),
        }
        const png = await renderCard(template, data, {
            art: { bg: await solidPng(500, 700, '#101010') },
            headshot: await solidPng(420, 420, '#3355ff'),
            teamLogo: null,
        }, await loadTestFonts())
        const meta = await sharp(png).metadata()
        expect(meta.format).toBe('png')
        expect(meta.width).toBe(500)
        expect(meta.height).toBe(700)
    }, 30000)
})
