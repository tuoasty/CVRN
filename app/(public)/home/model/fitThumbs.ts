export const THUMB_GAP = 8;
export const THUMB_ROW_WIDTH = 1376;
export const THUMB_FULL_ROW = 7;
export const THUMB_HEIGHT = ((THUMB_ROW_WIDTH - (THUMB_FULL_ROW - 1) * THUMB_GAP) / THUMB_FULL_ROW) * 9 / 16;
const EPSILON = 0.5;
export const MEDIA_ROW_HEIGHT = 190;

export function fitThumbs(ratios: number[], rowWidth = THUMB_ROW_WIDTH, height = THUMB_HEIGHT, gap = THUMB_GAP): number {
    let used = 0;
    let count = 0;
    for (const ratio of ratios) {
        const width = height * ratio + (count > 0 ? gap : 0);
        if (count > 0 && used + width > rowWidth + EPSILON) break;
        used += width;
        count += 1;
    }
    return count;
}

export function fitRows(ratios: number[], rows: number, rowWidth: number, height: number, gap: number): number {
    let line = 1;
    let used = 0;
    let inLine = 0;
    let count = 0;
    for (const ratio of ratios) {
        const width = height * ratio;
        if (inLine > 0 && used + gap + width > rowWidth) {
            line += 1;
            if (line > rows) break;
            used = 0;
            inLine = 0;
        }
        used += (inLine > 0 ? gap : 0) + width;
        inLine += 1;
        count += 1;
    }
    return count;
}
