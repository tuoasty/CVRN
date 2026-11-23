import type { LuaValue } from '../../types/luaValue'
import type { NormalizeResult, ServeStyle } from '../../types/datasets'
import { describe, isTable, IssueLog } from './luaRead'

export function normalizeServeStyles(value: LuaValue): NormalizeResult<ServeStyle> {
    const log = new IssueLog()
    const payload: ServeStyle[] = []

    if (!isTable(value) || value.fields.length > 0) {
        log.error(`Expected a list of style names, found ${describe(value)}`)
        return { payload, issues: log.issues }
    }

    const seen = new Set<string>()
    value.items.forEach((item, i) => {
        if (typeof item !== 'string') {
            log.error(`Expected text, found ${describe(item)}`, `Entry ${i + 1}`)
            return
        }
        if (seen.has(item)) {
            log.warn('Listed more than once', item)
            return
        }
        seen.add(item)
        payload.push({ name: item })
    })

    return { payload, issues: log.issues }
}
