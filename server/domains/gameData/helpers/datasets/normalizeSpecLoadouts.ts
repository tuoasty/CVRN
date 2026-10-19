import type { LuaTable, LuaValue } from '../../types/luaValue'
import type { KitSlot, NormalizeResult, PlainValue, SpecLoadout, SpecTune } from '../../types/datasets'
import { describe, isCall, isTable, IssueLog, toPlain } from './luaRead'

const KIT_SLOTS: readonly string[] = ['Passive', 'Active'] satisfies KitSlot[]
const KNOWN_FIELDS = new Set(['Name', 'Height', 'Cooldown', 'Lifetime', 'EndOnSpike', 'MaxPower', 'ActiveMaxPower', 'Passive', 'Active', 'Tuning'])

export function normalizeSpecLoadouts(value: LuaValue): NormalizeResult<SpecLoadout> {
    const log = new IssueLog()
    const payload: SpecLoadout[] = []

    if (!isTable(value)) {
        log.error(`Expected a table of specs, found ${describe(value)}`)
        return { payload, issues: log.issues }
    }
    if (value.items.length > 0) log.error(`${value.items.length} entries have no spec key`)

    const indexByKey = new Map<string, number>()
    for (const field of value.fields) {
        const key = String(field.key)
        if (!isTable(field.value)) {
            log.error(`Expected a table, found ${describe(field.value)}`, key)
            continue
        }
        const loadout = readLoadout(key, field.value, log)
        if (!loadout) continue
        const existing = indexByKey.get(key)
        if (existing !== undefined) {
            log.warn('Defined more than once, the last definition wins', key)
            payload[existing] = loadout
        } else {
            indexByKey.set(key, payload.length)
            payload.push(loadout)
        }
    }

    return { payload, issues: log.issues }
}

function readLoadout(key: string, table: LuaTable, log: IssueLog): SpecLoadout | undefined {
    const fields = new Map<string, LuaValue>()
    const extra: Record<string, PlainValue> = {}

    if (table.items.length > 0) log.error('Has unnamed values', key)

    for (const { key: rawField, value } of table.fields) {
        const field = String(rawField)
        if (KNOWN_FIELDS.has(field)) {
            fields.set(field, value)
        } else {
            extra[field] = toPlain(value)
            log.warn(`Unknown field '${field}', kept as extra`, key)
        }
    }

    const errorsBefore = log.issues.filter(i => i.level === 'error').length
    const name = readString(fields.get('Name'), 'Name', key, log)
    const height = readNumber(fields.get('Height'), 'Height', key, log)
    const cooldown = readNumber(fields.get('Cooldown'), 'Cooldown', key, log)
    const maxPower = readNumber(fields.get('MaxPower'), 'MaxPower', key, log)
    const activeMaxPower = readNumber(fields.get('ActiveMaxPower'), 'ActiveMaxPower', key, log)
    const endOnSpike = readBoolean(fields.get('EndOnSpike'), 'EndOnSpike', key, log)
    const lifetime = fields.has('Lifetime') ? readNumber(fields.get('Lifetime'), 'Lifetime', key, log) : undefined
    const passive = readNames(fields.get('Passive'), 'Passive', key, log)
    const active = readNames(fields.get('Active'), 'Active', key, log)
    const tuning = readTuning(fields.get('Tuning'), key, log)
    if (log.issues.filter(i => i.level === 'error').length > errorsBefore) return undefined

    if (name !== key) log.warn(`Name "${name}" differs from its key`, key)

    const loadout: SpecLoadout = {
        key,
        name: name!,
        height: height!,
        cooldown: cooldown!,
        endOnSpike: endOnSpike!,
        maxPower: maxPower!,
        activeMaxPower: activeMaxPower!,
        passive: passive!,
        active: active!,
        tuning: tuning!,
    }
    if (lifetime !== undefined) loadout.lifetime = lifetime
    if (Object.keys(extra).length > 0) loadout.extra = extra
    return loadout
}

function readString(value: LuaValue | undefined, field: string, key: string, log: IssueLog): string | undefined {
    if (typeof value === 'string') return value
    log.error(`${field} should be text, found ${describe(value ?? null)}`, key)
    return undefined
}

function readNumber(value: LuaValue | undefined, field: string, key: string, log: IssueLog): number | undefined {
    if (typeof value === 'number') return value
    log.error(`${field} should be a number, found ${describe(value ?? null)}`, key)
    return undefined
}

function readBoolean(value: LuaValue | undefined, field: string, key: string, log: IssueLog): boolean | undefined {
    if (typeof value === 'boolean') return value
    log.error(`${field} should be true/false, found ${describe(value ?? null)}`, key)
    return undefined
}

function readNames(value: LuaValue | undefined, field: string, key: string, log: IssueLog): string[] | undefined {
    if (value === undefined || !isTable(value) || value.fields.length > 0) {
        log.error(`${field} should be a list of ability names, found ${describe(value ?? null)}`, key)
        return undefined
    }
    const names: string[] = []
    for (const item of value.items) {
        if (typeof item === 'string') names.push(item)
        else log.error(`${field} entries should be text, found ${describe(item)}`, key)
    }
    return names
}

function readTuning(value: LuaValue | undefined, key: string, log: IssueLog): SpecTune[] | undefined {
    if (value === undefined) return []
    if (!isTable(value) || value.fields.length > 0) {
        log.error(`Tuning should be a list of tune() calls, found ${describe(value)}`, key)
        return undefined
    }
    const tunes: SpecTune[] = []
    value.items.forEach((item, i) => {
        const where = `Tune ${i + 1}`
        if (!isCall(item) || item.callee !== 'tune') {
            log.error(`${where} should be tune(), found ${describe(item)}`, key)
            return
        }
        const [slot, ability, path, amount, ...rest] = item.args
        if (typeof slot !== 'string' || !KIT_SLOTS.includes(slot)) {
            log.error(`${where} slot should be Passive or Active`, key)
            return
        }
        if (typeof ability !== 'string' || typeof path !== 'string' || typeof amount !== 'number' || rest.length > 0) {
            log.error(`${where} should be tune(slot, ability, path, number)`, key)
            return
        }
        tunes.push({ slot: slot as KitSlot, ability, path, value: amount })
    })
    return tunes
}
