import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { processLogoBackground } from "../imageProcessing";

async function makeWhiteBgImage(w: number, h: number): Promise<Buffer> {
    const pixels = Buffer.alloc(w * h * 3, 255);
    return sharp(pixels, { raw: { width: w, height: h, channels: 3 } })
        .png()
        .toBuffer();
}

async function makeAlphaImage(w: number, h: number): Promise<Buffer> {
    const pixels = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
        pixels[i * 4] = 200;
        pixels[i * 4 + 1] = 100;
        pixels[i * 4 + 2] = 50;
        pixels[i * 4 + 3] = i < (w * h) / 2 ? 0 : 255;
    }
    return sharp(pixels, { raw: { width: w, height: h, channels: 4 } })
        .png()
        .toBuffer();
}

async function makeMixedCornerImage(w: number, h: number): Promise<Buffer> {
    const pixels = Buffer.alloc(w * h * 3);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 3;
            pixels[i] = x < w / 2 ? 255 : 0;
            pixels[i + 1] = y < h / 2 ? 255 : 0;
            pixels[i + 2] = 128;
        }
    }
    return sharp(pixels, { raw: { width: w, height: h, channels: 3 } })
        .png()
        .toBuffer();
}

describe("processLogoBackground", () => {
    it("returns bgRemoved:true for images with genuine transparent pixels", async () => {
        const buf = await makeAlphaImage(32, 32);
        const result = await processLogoBackground(buf);
        expect(result.bgRemoved).toBe(true);
        const meta = await sharp(result.buffer).metadata();
        expect(meta.hasAlpha).toBe(true);
    });

    it("removes uniform white background and sets bgRemoved:true", async () => {
        const buf = await makeWhiteBgImage(32, 32);
        const result = await processLogoBackground(buf);
        expect(result.bgRemoved).toBe(true);
        const raw = await sharp(result.buffer).ensureAlpha().raw().toBuffer();
        expect(raw[3]).toBe(0);
    });

    it("skips removal when corners have different colors, sets bgRemoved:false", async () => {
        const buf = await makeMixedCornerImage(64, 64);
        const result = await processLogoBackground(buf);
        expect(result.bgRemoved).toBe(false);
        expect(result.buffer).toBeInstanceOf(Buffer);
    });
});
