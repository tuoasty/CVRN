import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { cropRigToBox } from '../cropRigToBox'

const image = { width: 200, height: 200 }
const box = { w: 100, h: 100 }
const place = (imageX: number, imageY: number, imageW: number) => ({ imageX, imageY, imageW })

async function splitRig() {
    const half = (r: number, b: number) => sharp({ create: { width: 100, height: 200, channels: 4, background: { r, g: 0, b, alpha: 1 } } }).png().toBuffer()
    return sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([
            { input: await half(255, 0), left: 0, top: 0 },
            { input: await half(0, 255), left: 100, top: 0 },
        ])
        .png()
        .toBuffer()
}

async function pixel(png: Buffer, x: number, y: number) {
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const start = (y * info.width + x) * info.channels
    return { r: data[start], b: data[start + 2], a: data[start + 3] }
}

describe('cropRigToBox', () => {
    it('returns the box size, including a box that is not square', async () => {
        const out = await cropRigToBox(await splitRig(), image, place(0, 0, 200), { w: 120, h: 300 })
        const meta = await sharp(out).metadata()
        expect([meta.width, meta.height, meta.format]).toEqual([120, 300, 'png'])
    })

    it('rounds a box with fractional sides', async () => {
        const out = await cropRigToBox(await splitRig(), image, place(0, 0, 200), { w: 100.4, h: 99.6 })
        const meta = await sharp(out).metadata()
        expect([meta.width, meta.height]).toEqual([100, 100])
    })

    it('shows the left of the rig when zoomed in at the origin', async () => {
        const out = await cropRigToBox(await splitRig(), image, place(0, 0, 200), box)
        expect(await pixel(out, 50, 50)).toMatchObject({ r: 255, b: 0, a: 255 })
    })

    it('shows the right of the rig when moved left', async () => {
        const out = await cropRigToBox(await splitRig(), image, place(-100, 0, 200), box)
        expect(await pixel(out, 50, 50)).toMatchObject({ r: 0, b: 255, a: 255 })
    })

    it('leaves a transparent gap around a rig smaller than its box', async () => {
        const out = await cropRigToBox(await splitRig(), image, place(0, 0, 50), box)
        expect((await pixel(out, 25, 25)).a).toBe(255)
        expect((await pixel(out, 75, 75)).a).toBe(0)
    })

    it('renders nothing when the rig is moved outside the box', async () => {
        const out = await cropRigToBox(await splitRig(), image, place(200, 0, 100), box)
        expect((await pixel(out, 50, 50)).a).toBe(0)
    })

    it('handles a very deep zoom', async () => {
        const out = await cropRigToBox(await splitRig(), image, place(-1000, -1000, 2000), box)
        const meta = await sharp(out).metadata()
        expect([meta.width, meta.height]).toEqual([100, 100])
    })
})
