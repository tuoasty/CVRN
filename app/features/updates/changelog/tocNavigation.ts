export const OVERVIEW_ID = 'overview'

export interface TocPosition {
    id: string
    top: number
}

export function activeTocId(positions: TocPosition[], offset: number, atBottom: boolean): string | null {
    if (positions.length === 0) return null
    if (atBottom) return positions[positions.length - 1].id
    let active = positions[0].id
    for (const p of positions) {
        if (p.top > offset + 1) break
        active = p.id
    }
    return active
}
