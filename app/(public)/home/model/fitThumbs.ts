export const THUMB_HEIGHT = 96;
export const THUMB_GAP = 8;
export const THUMB_ROW_WIDTH = 1376;

export function fitThumbs(ratios: number[], rowWidth = THUMB_ROW_WIDTH, height = THUMB_HEIGHT, gap = THUMB_GAP): number {
    let used = 0;
    let count = 0;
    for (const ratio of ratios) {
        const width = height * ratio + (count > 0 ? gap : 0);
        if (count > 0 && used + width > rowWidth) break;
        used += width;
        count += 1;
    }
    return count;
}
