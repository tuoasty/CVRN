import { describe, it, expect, vi } from "vitest";
import sharp from "sharp";

vi.mock("@/server/domains/auth/queries/getCurrentGroups", () => ({ getCurrentGroups: vi.fn() }));
vi.mock("@/server/utils/rateLimiter", () => ({ checkUploadRateLimit: vi.fn() }));

import { IMAGE_PROFILES, validateAndCompressImage } from "../storage.service";

async function png(w: number, h: number): Promise<File> {
    const pixels = Buffer.alloc(w * h * 3, 128);
    const buf = await sharp(pixels, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
    return new File([new Uint8Array(buf)], "p.png", { type: "image/png" });
}

async function dimensions(buffer: Buffer) {
    const meta = await sharp(buffer).metadata();
    return [meta.width, meta.height, meta.format];
}

describe("validateAndCompressImage", () => {
    it("downsizes a spec photo to 800 on the long edge as webp", async () => {
        const r = await validateAndCompressImage(await png(1600, 2000), false, IMAGE_PROFILES.specPhoto);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(await dimensions(r.value.buffer)).toEqual([640, 800, "webp"]);
        expect(r.value.contentType).toBe("image/webp");
    });

    it("does not enlarge a small photo", async () => {
        const r = await validateAndCompressImage(await png(400, 500), false, IMAGE_PROFILES.specPhoto);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(await dimensions(r.value.buffer)).toEqual([400, 500, "webp"]);
    });

    it("rejects a photo over 2.5MB", async () => {
        const file = new File([new Uint8Array(2.5 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
        const r = await validateAndCompressImage(file, false, IMAGE_PROFILES.specPhoto);
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a gif", async () => {
        const file = new File([new Uint8Array(10)], "a.gif", { type: "image/gif" });
        const r = await validateAndCompressImage(file, false, IMAGE_PROFILES.specPhoto);
        expect(r.ok).toBe(false);
        if (r.ok) return;
        expect(r.error.code).toBe("VALIDATION_ERROR");
    });

    it("keeps the 256 logo cap by default", async () => {
        const r = await validateAndCompressImage(await png(1600, 2000), false);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(await dimensions(r.value.buffer)).toEqual([205, 256, "webp"]);
    });

    it("trims logo padding before resizing so the content fills the frame", async () => {
        const r = await validateAndCompressImage(await paddedLogo(600, 200), true);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(await dimensions(r.value.buffer)).toEqual([200, 200, "webp"]);
        expect(await cornerAlpha(r.value.buffer)).toBeGreaterThan(200);
    });

    it("does not trim spec photos", async () => {
        const r = await validateAndCompressImage(await paddedLogo(600, 200), false, IMAGE_PROFILES.specPhoto);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(await dimensions(r.value.buffer)).toEqual([600, 600, "webp"]);
    });
});

async function cornerAlpha(buffer: Buffer): Promise<number> {
    const {data} = await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject: true});
    return data[3];
}

async function paddedLogo(size: number, content: number, bg: [number, number, number, number] = [0, 0, 0, 0]): Promise<File> {
    const pixels = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) pixels.set(bg, i * 4);
    const start = (size - content) / 2;
    for (let y = start; y < start + content; y++) {
        for (let x = start; x < start + content; x++) {
            pixels.set([200, 30, 30, 255], (y * size + x) * 4);
        }
    }
    const buf = await sharp(pixels, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
    return new File([new Uint8Array(buf)], "logo.png", { type: "image/png" });
}

describe("validateAndCompressImage logo trim", () => {
    it("removes a solid background, then trims to the content", async () => {
        const r = await validateAndCompressImage(await paddedLogo(600, 200, [255, 255, 255, 255]), true);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.value.bgRemoved).toBe(true);
        expect(await dimensions(r.value.buffer)).toEqual([200, 200, "webp"]);
        expect(await cornerAlpha(r.value.buffer)).toBeGreaterThan(200);
    });

    it("keeps a solid background when removal is off", async () => {
        const r = await validateAndCompressImage(await paddedLogo(600, 200, [255, 255, 255, 255]), false);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(await dimensions(r.value.buffer)).toEqual([256, 256, "webp"]);
    });
});
