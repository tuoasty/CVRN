import type { LuaTable, LuaValue } from '../../types/luaValue'
import { KNOWN_BUILD_STATS, type BuildEffect, type BuildPassives, type NormalizeResult } from '../../types/datasets'
import { describe, isTable, IssueLog } from './luaRead'

const BONUS_SLOT = /^Ability\d+$/
const KNOWN_STATS: ReadonlySet<string> = new Set(KNOWN_BUILD_STATS)

export function normalizeBuildPassives(value: LuaValue): NormalizeResult<BuildPassives> {
    const log = new IssueLog()
    const payload: BuildPassives[] = []

    if (!isTable(value)) {
        log.error(`Expected a table of builds, found ${describe(value)}`)
        return { payload, issues: log.issues }
    }
    if (value.items.length > 0) log.error(`${value.items.length} entries have no build name`)

    const indexByBuild = new Map<string, number>()
    for (const field of value.fields) {
        const build = String(field.key)
        if (!isTable(field.value)) {
            log.error(`Expected a table, found ${describe(field.value)}`, build)
            continue
        }
        const entry = { build, effects: readEffects(build, field.value, log) }
        const existing = indexByBuild.get(build)
        if (existing !== undefined) {
            log.warn('Defined more than once, the last definition wins', build)
            payload[existing] = entry
        } else {
            indexByBuild.set(build, payload.length)
            payload.push(entry)
        }
    }

    return { payload, issues: log.issues }
}

function readEffects(build: string, table: LuaTable, log: IssueLog): BuildEffect[] {
    const effects: BuildEffect[] = []
    if (table.items.length > 0) log.warn(`${table.items.length} unnamed values skipped`, build)

    for (const { key: rawKey, value } of table.fields) {
        const key = String(rawKey)
        if (value === true) effects.push({ type: 'named', name: key })
        else if (value === false) log.warn(`"${key}" is set to false, skipped`, build)
        else if (BONUS_SLOT.test(key) && typeof value === 'string') effects.push({ type: 'bonus', slot: key, name: value })
        else if (typeof value === 'number') {
            if (!KNOWN_STATS.has(key)) log.warn(`No wording for build field ${key}`, build)
            effects.push({ type: 'stat', field: key, value })
        } else log.warn(`"${key}" has ${describe(value)}, skipped`, build)
    }
    return effects
}
