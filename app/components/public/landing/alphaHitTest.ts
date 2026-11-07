export interface AlphaMask {
    w: number;
    h: number;
    alpha: Uint8ClampedArray;
}

export async function loadAlphaMask(src: string, maxSide = 320): Promise<AlphaMask> {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    await img.decode();

    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", {willReadFrequently: true});
    if (!ctx) throw new Error("2d context unavailable");
    ctx.drawImage(img, 0, 0, w, h);

    const rgba = ctx.getImageData(0, 0, w, h).data;
    const alpha = new Uint8ClampedArray(w * h);
    for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
    return {w, h, alpha};
}

export function isOpaqueAt(mask: AlphaMask, u: number, v: number, threshold = 128): boolean {
    if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
    const x = Math.floor(u * mask.w);
    const y = Math.floor(v * mask.h);
    return mask.alpha[y * mask.w + x] >= threshold;
}
