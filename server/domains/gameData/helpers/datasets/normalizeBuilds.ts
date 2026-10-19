import type { LuaTable, LuaValue } from '../../types/luaValue'
import type { Build, BuildCombo, NormalizeResult } from '../../types/datasets'
import { describe, isTable, IssueLog } from './luaRead'

const TEXT_FIELDS = ['Name', 'Rarity', 'Physical', 'Technical'] as const
const NUMBER_FIELDS = ['MinHeight', 'MaxHeight'] as const
const KNOWN_FIELDS = new Set<string>([...TEXT_FIELDS, ...NUMBER_FIELDS])

export function normalizeBuilds(value: LuaValue): NormalizeResult<Build> {
    const log = new IssueLog()
    const byName = new Map<string, Build>()

    if (!isTable(value) || value.fields.length > 0) {
        log.error(`Expected a list of builds, found ${describe(value)}`)
        return { payload: [], issues: log.issues }
    }

    value.items.forEach((item, i) => {
        if (!isTable(item)) {
            log.error(`Expected a table, found ${describe(item)}`, `Row ${i + 1}`)
            return
        }
        const read = readRow(item, `Row ${i + 1}`, log)
        if (!read) return
        const { name, rarity, combo } = read

        const existing = byName.get(name)
        if (!existing) {
            byName.set(name, { name, rarity, combos: [combo] })
            return
        }
        if (existing.rarity !== rarity) log.warn(`Listed again as ${rarity}, keeping ${existing.rarity}`, name)
        const duplicate = existing.combos.some(c =>
            c.physical === combo.physical && c.technical === combo.technical && c.minHeight === combo.minHeight && c.maxHeight === combo.maxHeight)
        if (duplicate) log.warn(`${combo.physical} / ${combo.technical} is listed more than once`, name)
        else existing.combos.push(combo)
    })

    return { payload: [...byName.values()], issues: log.issues }
}

function readRow(table: LuaTable, fallback: string, log: IssueLog): { name: string; rarity: string; combo: BuildCombo } | undefined {
    const fields = new Map(table.fields.map(f => [String(f.key), f.value]))
    const rawName = fields.get('Name')
    const label = typeof rawName === 'string' ? rawName : fallback

    if (table.items.length > 0) log.error('Has unnamed values', label)
    for (const field of fields.keys()) {
        if (!KNOWN_FIELDS.has(field)) log.warn(`Unknown field '${field}' ignored`, label)
    }

    let valid = table.items.length === 0
    const text: Record<string, string> = {}
    for (const field of TEXT_FIELDS) {
        const v = fields.get(field)
        if (typeof v === 'string') text[field] = v
        else {
            log.error(`${field} should be text, found ${describe(v ?? null)}`, label)
            valid = false
        }
    }
    const numbers: Record<string, number> = {}
    for (const field of NUMBER_FIELDS) {
        const v = fields.get(field)
        if (typeof v === 'number') numbers[field] = v
        else {
            log.error(`${field} should be a number, found ${describe(v ?? null)}`, label)
            valid = false
        }
    }
    if (!valid) return undefined

    if (numbers.MinHeight > numbers.MaxHeight) log.warn(`MinHeight ${numbers.MinHeight} is above MaxHeight ${numbers.MaxHeight}`, label)

    return {
        name: text.Name,
        rarity: text.Rarity,
        combo: { physical: text.Physical, technical: text.Technical, minHeight: numbers.MinHeight, maxHeight: numbers.MaxHeight },
    }
}
