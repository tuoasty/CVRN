export const VERSION_WINDOW_SIZE = 9

export function versionWindow(total: number, current: number, size = VERSION_WINDOW_SIZE): { start: number; end: number } {
    if (total <= size) return { start: 0, end: total }
    const start = Math.min(Math.max(current - Math.floor(size / 2), 0), total - size)
    return { start, end: start + size }
}
