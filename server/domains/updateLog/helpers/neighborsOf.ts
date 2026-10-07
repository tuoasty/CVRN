import { UpdateLogIndexEntry } from '../types'

export function neighborsOf(index: UpdateLogIndexEntry[], version: string): { newer: UpdateLogIndexEntry | null; older: UpdateLogIndexEntry | null } {
    const i = index.findIndex(e => e.version === version)
    if (i === -1) return { newer: null, older: null }
    return {
        newer: index[i - 1] ?? null,
        older: index[i + 1] ?? null,
    }
}
