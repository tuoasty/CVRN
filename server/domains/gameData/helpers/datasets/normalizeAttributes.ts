import type { LuaValue } from '../../types/luaValue'
import type { AttributeEntry, NormalizeResult } from '../../types/datasets'
import { describe, isTable, IssueLog } from './luaRead'

export function normalizeAttributes(value: LuaValue): NormalizeResult<AttributeEntry> {
    const log = new IssueLog()
    const payload: AttributeEntry[] = []

    if (!isTable(value) || value.fields.length > 0) {
        log.error(`Expected a list of { Value, Weight } entries, found ${describe(value)}`)
        return { payload, issues: log.issues }
    }

    const seen = new Set<string>()
    value.items.forEach((item, i) => {
        const fallbackName = `Entry ${i + 1}`
        if (!isTable(item)) {
            log.error(`Expected a table, found ${describe(item)}`, fallbackName)
            return
        }
        const fields = new Map(item.fields.map(f => [String(f.key), f.value]))
        const name = fields.get('Value')
        const weight = fields.get('Weight')
        const label = typeof name === 'string' ? name : fallbackName

        for (const field of fields.keys()) {
            if (field !== 'Value' && field !== 'Weight') log.warn(`Unknown field '${field}' ignored`, label)
        }
        if (typeof name !== 'string') log.error(`Value should be text, found ${describe(name ?? null)}`, label)
        if (typeof weight !== 'number') log.error(`Weight should be a number, found ${describe(weight ?? null)}`, label)
        if (typeof name !== 'string' || typeof weight !== 'number') return

        if (seen.has(name)) log.warn('Listed more than once', name)
        seen.add(name)
        payload.push({ value: name, weight })
    })

    return { payload, issues: log.issues }
}
