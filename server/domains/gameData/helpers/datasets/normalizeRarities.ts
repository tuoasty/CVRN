import type { LuaValue } from '../../types/luaValue'
import type { NormalizeResult, Rarity } from '../../types/datasets'
import { describe, isCall, isTable, IssueLog } from './luaRead'

const REQUIRED = ['Name', 'Color', 'Weight', 'Normal', 'Lucky'] as const

export function normalizeRarities(value: LuaValue): NormalizeResult<Rarity> {
    const log = new IssueLog()
    const payload: Rarity[] = []

    if (!isTable(value) || value.fields.length > 0) {
        log.error(`Expected a list of rarities, found ${describe(value)}`)
        return { payload, issues: log.issues }
    }

    value.items.forEach((item, i) => {
        const fallbackName = `Rarity ${i + 1}`
        if (!isTable(item)) {
            log.error(`Expected a table, found ${describe(item)}`, fallbackName)
            return
        }
        const fields = new Map(item.fields.map(f => [String(f.key), f.value]))
        const name = typeof fields.get('Name') === 'string' ? (fields.get('Name') as string) : fallbackName

        for (const field of fields.keys()) {
            if (!(REQUIRED as readonly string[]).includes(field)) log.warn(`Unknown field '${field}' ignored`, name)
        }

        if (typeof fields.get('Name') !== 'string') log.error('Name should be text', name)
        const color = readColor(fields.get('Color') ?? null)
        if (color === null) log.error(`Color should be Color3.fromRGB(r, g, b), found ${describe(fields.get('Color') ?? null)}`, name)

        const numbers: Record<string, number> = {}
        for (const field of ['Weight', 'Normal', 'Lucky']) {
            const v = fields.get(field)
            if (typeof v === 'number') numbers[field] = v
            else log.error(`${field} should be a number, found ${describe(v ?? null)}`, name)
        }

        if (color === null || Object.keys(numbers).length < 3 || typeof fields.get('Name') !== 'string') return
        payload.push({ name, color, weight: numbers.Weight, normalPct: numbers.Normal, luckyPct: numbers.Lucky })
    })

    const seenWeights = new Set<number>()
    for (const rarity of payload) {
        if (seenWeights.has(rarity.weight)) log.warn(`Weight ${rarity.weight} is used by more than one rarity`, rarity.name)
        seenWeights.add(rarity.weight)
    }

    for (const [field, label] of [['normalPct', 'Normal'], ['luckyPct', 'Lucky']] as const) {
        const total = payload.reduce((sum, r) => sum + r[field], 0)
        if (payload.length > 0 && Math.abs(total - 100) > 1e-9) log.warn(`${label} chances add up to ${total}, not 100`)
    }

    return { payload, issues: log.issues }
}

function readColor(value: LuaValue): string | null {
    if (!isCall(value)) return null
    const nums = value.args.filter((a): a is number => typeof a === 'number')

    if (value.callee === 'Color3.fromRGB' && nums.length === 3 && value.args.length === 3) return toHex(nums)
    if (value.callee === 'Color3.new' && nums.length === 3 && value.args.length === 3) return toHex(nums.map(n => n * 255))
    if (value.callee === 'Color3.fromHex' && typeof value.args[0] === 'string') {
        const hex = value.args[0].replace(/^#/, '').toLowerCase()
        return /^[0-9a-f]{6}$/.test(hex) ? `#${hex}` : null
    }
    return null
}

function toHex(channels: number[]): string {
    return '#' + channels.map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')
}
