import type { LuaValue } from '../../types/luaValue'
import type { HeightEntry, NormalizeResult } from '../../types/datasets'
import { describe, isTable, IssueLog } from './luaRead'

export function normalizeHeights(value: LuaValue): NormalizeResult<HeightEntry> {
    const log = new IssueLog()
    const payload: HeightEntry[] = []

    if (!isTable(value) || value.fields.length > 0) {
        log.error(`Expected a list of { Value, Weight } entries, found ${describe(value)}`)
        return { payload, issues: log.issues }
    }

    const seen = new Set<number>()
    value.items.forEach((item, i) => {
        const fallbackName = `Entry ${i + 1}`
        if (!isTable(item)) {
            log.error(`Expected a table, found ${describe(item)}`, fallbackName)
            return
        }
        const fields = new Map(item.fields.map(f => [String(f.key), f.value]))
        const height = fields.get('Value')
        const weight = fields.get('Weight')
        const label = typeof height === 'number' ? String(height) : fallbackName

        for (const field of fields.keys()) {
            if (field !== 'Value' && field !== 'Weight') log.warn(`Unknown field '${field}' ignored`, label)
        }
        if (typeof height !== 'number') log.error(`Value should be a number, found ${describe(height ?? null)}`, label)
        if (typeof weight !== 'number') log.error(`Weight should be a number, found ${describe(weight ?? null)}`, label)
        if (typeof height !== 'number' || typeof weight !== 'number') return

        if (seen.has(height)) log.warn('Listed more than once', label)
        seen.add(height)
        payload.push({ value: height, weight })
    })

    return { payload, issues: log.issues }
}
