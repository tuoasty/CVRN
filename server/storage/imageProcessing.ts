import sharp from "sharp";

const CORNER_SAMPLE_SIZE = 5;
const CORNER_AGREEMENT_THRESHOLD = 20;
const FLOODFILL_TOLERANCE = 25;

type RGB = [number, number, number];

function sampleCorner(
    pixels: Uint8Array,
    width: number,
    height: number,
    startX: number,
    startY: number
): RGB {
    let r = 0, g = 0, b = 0, count = 0;
    for (let dy = 0; dy < CORNER_SAMPLE_SIZE; dy++) {
        for (let dx = 0; dx < CORNER_SAMPLE_SIZE; dx++) {
            const x = Math.min(startX + dx, width - 1);
            const y = Math.min(startY + dy, height - 1);
            const i = (y * width + x) * 4;
            r += pixels[i];
            g += pixels[i + 1];
            b += pixels[i + 2];
            count++;
        }
    }
    return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

function colorDistance(a: RGB, b: RGB): number {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function averageColor(colors: RGB[]): RGB {
    const sum = colors.reduce(
        (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]] as RGB,
        [0, 0, 0] as RGB
    );
    return [
        Math.round(sum[0] / colors.length),
        Math.round(sum[1] / colors.length),
        Math.round(sum[2] / colors.length),
    ];
}

function hasTransparentPixels(pixels: Uint8Array): boolean {
    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] < 128) return true;
    }
    return false;
}

function bfsFloodfill(
    pixels: Uint8Array,
    width: number,
    height: number,
    bgColor: RGB,
    tolerance: number
): Uint8Array {
    const result = new Uint8Array(pixels);
    const visited = new Uint8Array(width * height);
    const queue: number[] = [];

    const seeds = [
        0,
        width - 1,
        (height - 1) * width,
        (height - 1) * width + width - 1,
    ];

    for (const idx of seeds) {
        if (!visited[idx]) {
            visited[idx] = 1;
            queue.push(idx);
        }
    }

    let head = 0;
    while (head < queue.length) {
        const idx = queue[head++];
        const px = idx % width;
        const py = Math.floor(idx / width);
        const i = idx * 4;
        const pixColor: RGB = [result[i], result[i + 1], result[i + 2]];

        if (colorDistance(pixColor, bgColor) <= tolerance) {
            result[i + 3] = 0;
            const neighbors = [
                px > 0 ? idx - 1 : -1,
                px < width - 1 ? idx + 1 : -1,
                py > 0 ? idx - width : -1,
                py < height - 1 ? idx + width : -1,
            ];
            for (const n of neighbors) {
                if (n >= 0 && !visited[n]) {
                    visited[n] = 1;
                    queue.push(n);
                }
            }
        }
    }

    return result;
}

export async function processLogoBackground(
    input: Buffer
): Promise<{ buffer: Buffer; bgRemoved: boolean }> {
    const { width, height } = await sharp(input).metadata();
    if (!width || !height) {
        const buffer = await sharp(input).webp({ quality: 85 }).toBuffer();
        return { buffer, bgRemoved: false };
    }

    const rawBuf = await sharp(input).ensureAlpha().raw().toBuffer();
    const pixels = new Uint8Array(rawBuf);

    if (hasTransparentPixels(pixels)) {
        const buffer = await sharp(Buffer.from(pixels), { raw: { width, height, channels: 4 } })
            .webp({ quality: 85 })
            .toBuffer();
        return { buffer, bgRemoved: true };
    }

    const corners: RGB[] = [
        sampleCorner(pixels, width, height, 0, 0),
        sampleCorner(pixels, width, height, width - CORNER_SAMPLE_SIZE, 0),
        sampleCorner(pixels, width, height, 0, height - CORNER_SAMPLE_SIZE),
        sampleCorner(pixels, width, height, width - CORNER_SAMPLE_SIZE, height - CORNER_SAMPLE_SIZE),
    ];

    const avg = averageColor(corners);
    const maxDist = Math.max(...corners.map((c) => colorDistance(c, avg)));

    if (maxDist > CORNER_AGREEMENT_THRESHOLD) {
        const buffer = await sharp(input).webp({ quality: 85 }).toBuffer();
        return { buffer, bgRemoved: false };
    }

    const modified = bfsFloodfill(pixels, width, height, avg, FLOODFILL_TOLERANCE);
    const buffer = await sharp(Buffer.from(modified), { raw: { width, height, channels: 4 } })
        .webp({ quality: 85 })
        .toBuffer();

    return { buffer, bgRemoved: true };
}
