export interface Line {
    start: number
    text: string
}

export function splitLines(value: string): Line[] {
    const lines: Line[] = []
    let start = 0
    for (const text of value.split('\n')) {
        lines.push({ start, text })
        start += text.length + 1
    }
    return lines
}

export function lineIndexAt(lines: Line[], pos: number): number {
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].start <= pos) return i
    }
    return 0
}

export function touchedLineRange(lines: Line[], selStart: number, selEnd: number): { first: number; last: number } {
    const first = lineIndexAt(lines, selStart)
    let last = lineIndexAt(lines, selEnd)
    if (last > first && selEnd === lines[last].start) last--
    return { first, last }
}
