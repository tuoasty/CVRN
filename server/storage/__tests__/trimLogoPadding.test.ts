import {describe, expect, it} from "vitest";
import sharp from "sharp";
import {trimLogoPadding} from "../imageProcessing";

type Rect = {left: number; top: number; width: number; height: number};
type RGBA = [number, number, number, number];

async function paddedImage(size: number, content: Rect, bg: RGBA, fg: RGBA = [200, 30, 30, 255]): Promise<Buffer> {
    const pixels = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const inside = x >= content.left && x < content.left + content.width && y >= content.top && y < content.top + content.height;
            const c = inside ? fg : bg;
            pixels.set(c, (y * size + x) * 4);
        }
    }
    return sharp(pixels, {raw: {width: size, height: size, channels: 4}}).png().toBuffer();
}

async function dims(buf: Buffer) {
    const {width, height} = await sharp(buf).metadata();
    return {width, height};
}

const CENTER: Rect = {left: 200, top: 200, width: 200, height: 200};
const TRANSPARENT: RGBA = [0, 0, 0, 0];
const WHITE: RGBA = [255, 255, 255, 255];

describe("trimLogoPadding", () => {
    it("trims transparent padding to the content", async () => {
        const input = await paddedImage(600, CENTER, TRANSPARENT);
        expect(await dims(await trimLogoPadding(input))).toEqual({width: 200, height: 200});
    });

    it("leaves opaque padding alone", async () => {
        const input = await paddedImage(600, CENTER, WHITE);
        expect(await trimLogoPadding(input)).toBe(input);
    });

    it("finds off-center content", async () => {
        const input = await paddedImage(600, {left: 100, top: 50, width: 200, height: 100}, TRANSPARENT);
        expect(await dims(await trimLogoPadding(input))).toEqual({width: 200, height: 100});
    });

    it("returns the input when content already fills the image", async () => {
        const input = await paddedImage(300, {left: 0, top: 0, width: 300, height: 300}, WHITE);
        expect(await trimLogoPadding(input)).toBe(input);
    });

    it("returns the input when the image is all padding", async () => {
        const input = await paddedImage(200, {left: 0, top: 0, width: 0, height: 0}, TRANSPARENT);
        expect(await trimLogoPadding(input)).toBe(input);
    });

    it("returns the input for bytes that are not an image", async () => {
        const input = Buffer.from("nope");
        expect(await trimLogoPadding(input)).toBe(input);
    });
});
