export interface PasteSource {
    name: string
    startLine: number
}

const SEPARATOR = '\n\n'

export function joinFiles(files: { name: string; text: string }[]): { text: string; sources: PasteSource[] } {
    const sources: PasteSource[] = []
    let line = 1
    for (const file of files) {
        sources.push({ name: file.name, startLine: line })
        line += file.text.split('\n').length + 1
    }
    return { text: files.map(f => f.text).join(SEPARATOR), sources }
}

export function sourceForLine(sources: PasteSource[], line: number): string | null {
    let found: string | null = null
    for (const source of sources) {
        if (source.startLine > line) break
        found = source.name
    }
    return found
}

export function canChoose(s: { previewedText: string | null; text: string; busy: boolean }): boolean {
    return s.previewedText !== null && s.previewedText === s.text && !s.busy
}
