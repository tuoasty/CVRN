import type { LuaCall, LuaTable, LuaValue } from '../../types/luaValue'
import type { DatasetIssue, PlainValue, ScalarValue } from '../../types/datasets'

export function isTable(value: LuaValue): value is LuaTable {
    return typeof value === 'object' && value !== null && value.kind === 'table'
}

export function isCall(value: LuaValue): value is LuaCall {
    return typeof value === 'object' && value !== null && value.kind === 'call'
}

export function isScalar(value: LuaValue): value is ScalarValue {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

export function describe(value: LuaValue): string {
    if (value === null) return 'nil'
    if (typeof value === 'string') return 'text'
    if (typeof value === 'number') return 'a number'
    if (typeof value === 'boolean') return 'true/false'
    if (value.kind === 'table') return 'a table'
    if (value.kind === 'call') return `a call to ${value.callee}()`
    return `a reference to ${value.path}`
}

export function toPlain(value: LuaValue): PlainValue {
    if (value === null || isScalar(value)) return value
    if (value.kind === 'call') return { $call: value.callee, args: value.args.map(toPlain) }
    if (value.kind === 'ref') return { $ref: value.path }
    const items = value.items.map(toPlain)
    if (value.fields.length === 0) return items
    const fields: Record<string, PlainValue> = {}
    for (const field of value.fields) fields[String(field.key)] = toPlain(field.value)
    return items.length === 0 ? fields : { items, fields }
}

export class IssueLog {
    readonly issues: DatasetIssue[] = []

    error(message: string, entry?: string): void {
        this.issues.push({ level: 'error', message, entry })
    }

    warn(message: string, entry?: string): void {
        this.issues.push({ level: 'warning', message, entry })
    }
}
