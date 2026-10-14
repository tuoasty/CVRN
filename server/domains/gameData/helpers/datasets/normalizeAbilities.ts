import type { LuaTable, LuaValue } from '../../types/luaValue'
import type {
    Ability,
    AbilityActive,
    AbilityEffect,
    EffectOp,
    NormalizeResult,
    PlainValue,
    ScalarValue,
} from '../../types/datasets'
import { describe, isCall, isScalar, isTable, IssueLog, toPlain } from './luaRead'

const EFFECT_OPS: EffectOp[] = ['add', 'set', 'scale']

export function normalizeAbilities(value: LuaValue): NormalizeResult<Ability> {
    const log = new IssueLog()
    const payload: Ability[] = []

    if (!isTable(value)) {
        log.error(`Expected a table of abilities, found ${describe(value)}`)
        return { payload, issues: log.issues }
    }
    if (value.items.length > 0) log.error(`${value.items.length} entries have no ability name`)

    const indexByKey = new Map<string, number>()
    for (const field of value.fields) {
        const key = String(field.key)
        if (!isTable(field.value)) {
            log.error(`Expected a table, found ${describe(field.value)}`, key)
            continue
        }
        const ability = readAbility(key, field.value, log)
        const existing = indexByKey.get(key)
        if (existing !== undefined) {
            log.warn('Defined more than once, the last definition wins', key)
            payload[existing] = ability
        } else {
            indexByKey.set(key, payload.length)
            payload.push(ability)
        }
    }

    return { payload, issues: log.issues }
}

function readAbility(key: string, table: LuaTable, log: IssueLog): Ability {
    const ability: Ability = { key, effects: [], params: {} }
    const extra: Record<string, PlainValue> = {}
    let toggleName: string | undefined
    let toggleDefault: boolean | undefined

    if (table.items.length > 0) {
        extra.items = table.items.map(toPlain)
        log.warn('Has unnamed values, kept as extra', key)
    }

    for (const { key: rawField, value } of table.fields) {
        const field = String(rawField)
        switch (field) {
            case 'Description':
                ability.description = readString(value, field, key, log)
                break
            case 'Group':
                ability.group = readString(value, field, key, log)
                break
            case 'TeamSlot':
                ability.teamSlot = readString(value, field, key, log)
                break
            case 'Toggle':
                toggleName = readString(value, field, key, log)
                break
            case 'ToggleDefault':
                toggleDefault = readBoolean(value, field, key, log)
                break
            case 'ParamsAlways':
                ability.paramsAlways = readBoolean(value, field, key, log)
                break
            case 'Effects':
                ability.effects = readEffects(value, key, log)
                break
            case 'Params':
                ability.params = readParams(value, key, log)
                break
            case 'Active':
                ability.active = readActive(value, key, log)
                break
            case 'Team':
                ability.team = readStringList(value, field, key, log)
                break
            case 'Aura':
                ability.aura = readStringList(value, field, key, log)
                break
            default:
                extra[field] = toPlain(value)
                log.warn(`Unknown field '${field}', kept as extra`, key)
        }
    }

    if (toggleName !== undefined) {
        ability.toggle = { name: toggleName, defaultOn: toggleDefault ?? true }
    } else if (toggleDefault !== undefined) {
        log.warn('ToggleDefault is set but Toggle is missing', key)
    }
    if (Object.keys(extra).length > 0) ability.extra = extra

    return ability
}

function readString(value: LuaValue, field: string, key: string, log: IssueLog): string | undefined {
    if (typeof value === 'string') return value
    log.error(`${field} should be text, found ${describe(value)}`, key)
    return undefined
}

function readBoolean(value: LuaValue, field: string, key: string, log: IssueLog): boolean | undefined {
    if (typeof value === 'boolean') return value
    log.error(`${field} should be true/false, found ${describe(value)}`, key)
    return undefined
}

function readNumber(value: LuaValue, field: string, key: string, log: IssueLog): number | undefined {
    if (typeof value === 'number') return value
    log.error(`${field} should be a number, found ${describe(value)}`, key)
    return undefined
}

function readStringList(value: LuaValue, field: string, key: string, log: IssueLog): string[] | undefined {
    if (!isTable(value) || value.fields.length > 0) {
        log.error(`${field} should be a list of names, found ${describe(value)}`, key)
        return undefined
    }
    const names: string[] = []
    for (const item of value.items) {
        if (typeof item === 'string') names.push(item)
        else log.error(`${field} entries should be text, found ${describe(item)}`, key)
    }
    return names
}

function readEffects(value: LuaValue, key: string, log: IssueLog): AbilityEffect[] {
    if (!isTable(value) || value.fields.length > 0) {
        log.error(`Effects should be a list of add/set/scale calls, found ${describe(value)}`, key)
        return []
    }

    const effects: AbilityEffect[] = []
    value.items.forEach((item, i) => {
        const where = `Effect ${i + 1}`
        if (!isCall(item) || !EFFECT_OPS.includes(item.callee as EffectOp)) {
            log.error(`${where} should be add(), set() or scale(), found ${describe(item)}`, key)
            return
        }
        const [tag, amount, options, ...rest] = item.args
        if (typeof tag !== 'string') {
            log.error(`${where} needs a tag name as its first value`, key)
            return
        }
        if (typeof amount !== 'number') {
            log.error(`${where} (${tag}) needs a number as its second value, found ${describe(amount ?? null)}`, key)
            return
        }
        if (rest.length > 0) log.error(`${where} (${tag}) has more values than expected`, key)

        const effect: AbilityEffect = { op: item.callee as EffectOp, tag, amount }
        if (options !== undefined) {
            const read = readScalarMap(options, `${where} (${tag}) options`, key, log)
            if (read && Object.keys(read).length > 0) effect.options = read
        }
        effects.push(effect)
    })
    return effects
}

function readParams(value: LuaValue, key: string, log: IssueLog): Record<string, ScalarValue> {
    return readScalarMap(value, 'Params', key, log) ?? {}
}

function readScalarMap(value: LuaValue, where: string, key: string, log: IssueLog): Record<string, ScalarValue> | undefined {
    if (!isTable(value) || value.items.length > 0) {
        log.error(`${where} should be a table of named values, found ${describe(value)}`, key)
        return undefined
    }
    const map: Record<string, ScalarValue> = {}
    for (const field of value.fields) {
        const name = String(field.key)
        if (isScalar(field.value)) map[name] = field.value
        else log.error(`${where}: '${name}' should be a plain value, found ${describe(field.value)}`, key)
    }
    return map
}

function readActive(value: LuaValue, key: string, log: IssueLog): AbilityActive | undefined {
    if (!isTable(value) || value.items.length > 0) {
        log.error(`Active should be a table, found ${describe(value)}`, key)
        return undefined
    }

    const active: AbilityActive = {}
    const extra: Record<string, PlainValue> = {}
    for (const { key: rawField, value: fieldValue } of value.fields) {
        const field = String(rawField)
        switch (field) {
            case 'Cooldown':
                active.cooldown = readNumber(fieldValue, 'Active.Cooldown', key, log)
                break
            case 'Duration':
                active.duration = readNumber(fieldValue, 'Active.Duration', key, log)
                break
            case 'Behaviour':
                active.behaviour = readString(fieldValue, 'Active.Behaviour', key, log)
                break
            case 'Grounded':
                active.grounded = readBoolean(fieldValue, 'Active.Grounded', key, log)
                break
            case 'Auto':
                active.auto = readBoolean(fieldValue, 'Active.Auto', key, log)
                break
            default:
                extra[field] = toPlain(fieldValue)
                log.warn(`Unknown field 'Active.${field}', kept as extra`, key)
        }
    }
    if (active.cooldown === undefined) log.warn('Active has no Cooldown', key)
    if (Object.keys(extra).length > 0) active.extra = extra
    return active
}
