import type { LuaValue } from '../../types/luaValue'
import type { NormalizeResult, ServeStyleValue } from '../../types/datasets'
import { describe, isTable, IssueLog } from './luaRead'

export function normalizeServeStyleValues(value: LuaValue): NormalizeResult<ServeStyleValue> {
    const log = new IssueLog()
    const payload: ServeStyleValue[] = []

    if (!isTable(value) || value.items.length > 0) {
        log.error(`Expected a table of named numbers, found ${describe(value)}`)
        return { payload, issues: log.issues }
    }

    for (const field of value.fields) {
        const key = String(field.key)
        if (typeof field.value !== 'number') {
            log.error(`Should be a number, found ${describe(field.value)}`, key)
            continue
        }
        payload.push({ key, value: field.value })
    }

    return { payload, issues: log.issues }
}
