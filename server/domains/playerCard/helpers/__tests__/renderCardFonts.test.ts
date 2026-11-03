import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CardData, CardTemplate } from '../../types'
import type { CardFonts } from '../cardFont'
import { renderCard } from '../renderCard'

const captured = vi.hoisted(() => ({ fonts: [] as unknown[] }))

vi.mock('next/og', () => ({
    ImageResponse: class {
        constructor(_element: unknown, options: { fonts: unknown }) {
            captured.fonts.push(options.fonts)
        }
        async arrayBuffer() {
            return new ArrayBuffer(0)
        }
    },
}))

const template = { id: 't', width: 10, height: 10, layers: [] } as unknown as CardTemplate
const data = {} as CardData
const assets = { art: {}, headshot: null, teamLogo: null }

const fontSet = () => {
    const font = { name: 'f', data: new ArrayBuffer(1), font: {} }
    return { bebas: font, sunbornSans: font, norms: font, normsBold: font } as unknown as CardFonts
}

describe('renderCard fonts', () => {
    beforeEach(() => {
        captured.fonts.length = 0
    })

    it('passes the same fonts array for the same fonts, so Satori reuses its parsed fonts', async () => {
        const fonts = fontSet()
        await renderCard(template, data, assets, fonts)
        await renderCard(template, data, assets, fonts)
        expect(captured.fonts[0]).toBe(captured.fonts[1])
    })

    it('builds a separate array for different fonts', async () => {
        await renderCard(template, data, assets, fontSet())
        await renderCard(template, data, assets, fontSet())
        expect(captured.fonts[0]).not.toBe(captured.fonts[1])
    })
})
