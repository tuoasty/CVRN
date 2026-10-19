export function normalizeSpecName(name: string): string {
    return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function nameDistance(a: string, b: string): number {
    const x = normalizeSpecName(a)
    const y = normalizeSpecName(b)
    let previous = Array.from({ length: y.length + 1 }, (_, j) => j)
    for (let i = 1; i <= x.length; i++) {
        const current = [i]
        for (let j = 1; j <= y.length; j++) {
            const cost = x[i - 1] === y[j - 1] ? 0 : 1
            current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost)
        }
        previous = current
    }
    return previous[y.length]
}
