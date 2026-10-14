import type { DatasetDiff, GameDatasetKind, GameDatasetPayloads } from '../../types/datasets'
import { entryKey } from './registry'

export function stableStringify(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(v => (v === undefined ? 'null' : stableStringify(v))).join(',')}]`
    if (value !== null && typeof value === 'object') {
        const fields = Object.keys(value)
            .filter(k => (value as Record<string, unknown>)[k] !== undefined)
            .sort()
            .map(k => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
        return `{${fields.join(',')}}`
    }
    return JSON.stringify(value)
}

export function diffDataset<K extends GameDatasetKind>(kind: K, before: GameDatasetPayloads[K], after: GameDatasetPayloads[K]): DatasetDiff {
    const keyOf = (entry: GameDatasetPayloads[K][number]) => entryKey(kind, entry)
    const beforeByKey = new Map(before.map(e => [keyOf(e), stableStringify(e)]))
    const afterKeys = new Set(after.map(keyOf))

    const added: string[] = []
    const changed: string[] = []
    for (const entry of after) {
        const key = keyOf(entry)
        const old = beforeByKey.get(key)
        if (old === undefined) added.push(key)
        else if (old !== stableStringify(entry)) changed.push(key)
    }
    const removed = before.map(keyOf).filter(k => !afterKeys.has(k))

    const keptBefore = before.map(keyOf).filter(k => afterKeys.has(k))
    const keptAfter = after.map(keyOf).filter(k => beforeByKey.has(k))
    const reordered = keptBefore.some((k, i) => k !== keptAfter[i])

    return { added, removed, changed, reordered, unchanged: added.length + removed.length + changed.length === 0 && !reordered }
}
