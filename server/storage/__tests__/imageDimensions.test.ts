import {describe, expect, it} from "vitest";
import sharp from "sharp";
import {readImageDimensions} from "../imageDimensions";

describe("readImageDimensions", () => {
    it("reads width and height from a real image", async () => {
        const buf = await sharp({create: {width: 800, height: 1000, channels: 3, background: "#000"}}).png().toBuffer();
        expect(await readImageDimensions(new Blob([new Uint8Array(buf)]))).toEqual({width: 800, height: 1000});
    });

    it("returns null for bytes that are not an image", async () => {
        expect(await readImageDimensions(new Blob(["nope"]))).toBeNull();
    });
});
