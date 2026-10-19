import { describe, it, expect, vi } from "vitest";
import sharp from "sharp";

vi.mock("@/server/db/roles.repo", () => ({ getUserRole: vi.fn() }));
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
});
