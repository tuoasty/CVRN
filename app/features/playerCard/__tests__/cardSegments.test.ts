import { describe, expect, it } from 'vitest'
import type { CardLayer } from '@/server/domains/playerCard'
import { CARD_SEGMENTS, colorInputValue, layerLabel, moveLayer } from '../cardSegments'

const art: CardLayer = { kind: 'art', src: 'bg.png', x: 0, y: 0, w: 10, h: 10 }
const stats: CardLayer = { kind: 'stats', x: 0, y: 0, w: 10, h: 10, size: 10, color: '#ffffff', letterSpacing: 0 }
const logo: CardLayer = { kind: 'image', field: 'teamLogo', x: 0, y: 0, w: 10, h: 10, fit: 'contain' }

describe('moveLayer', () => {
    const layers = [art, stats, logo]

    it('moves a row up and down', () => {
        expect(moveLayer(layers, 2, -1)).toEqual([art, logo, stats])
        expect(moveLayer(layers, 1, 1)).toEqual([art, logo, stats])
    })

    it('does nothing at the top end', () => {
        expect(moveLayer(layers, 2, 1)).toBe(layers)
    })

    it('never moves the art row', () => {
        expect(moveLayer(layers, 0, 1)).toBe(layers)
        expect(moveLayer(layers, 0, -1)).toBe(layers)
    })

    it('never moves a row below the art', () => {
        expect(moveLayer(layers, 1, -1)).toBe(layers)
    })

    it('does not change the original list', () => {
        moveLayer(layers, 2, -1)
        expect(layers).toEqual([art, stats, logo])
    })
})

describe('colorInputValue', () => {
    it('keeps a full hex colour', () => {
        expect(colorInputValue('#1A2B3C')).toBe('#1a2b3c')
    })

    it('expands a short hex colour, which the colour input cannot read', () => {
        expect(colorInputValue('#fff')).toBe('#ffffff')
    })

    it('falls back to white for anything else', () => {
        expect(colorInputValue('red')).toBe('#ffffff')
    })
})

describe('CARD_SEGMENTS', () => {
    it('offers Display name and Team name', () => {
        const display = CARD_SEGMENTS.find(s => s.key === 'displayName')
        const team = CARD_SEGMENTS.find(s => s.key === 'teamName')
        expect(display && layerLabel(display.make())).toBe('Display name')
        expect(team && layerLabel(team.make())).toBe('Team name')
    })

    it('offers a Rig box separate from Avatar', () => {
        const rig = CARD_SEGMENTS.find(s => s.key === 'rig')
        expect(rig && layerLabel(rig.make())).toBe('Rig')
    })

    it('never offers an art layer', () => {
        expect(CARD_SEGMENTS.every(s => s.make().kind !== 'art')).toBe(true)
    })
})
