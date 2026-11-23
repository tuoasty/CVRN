import type { LuaStatement, LuaTable, LuaValue } from '../../types/luaValue'
import { GAME_DATASET_KINDS, type GameDatasetKind } from '../../types/datasets'
import { isCall, isTable } from './luaRead'
import { kindForRoot } from './registry'

export type Detection =
    | { status: 'root'; kind: GameDatasetKind; value: LuaValue }
    | { status: 'shape'; candidates: GameDatasetKind[]; value: LuaValue }
    | { status: 'unknown' }

const TUNABLE_DEFINES: Record<string, GameDatasetKind> = {
    Style: 'serveStyleValues',
}

function has(table: LuaTable, ...names: string[]): boolean {
    const keys = new Set(table.fields.map(f => String(f.key)))
    return names.every(n => keys.has(n))
}

function field(table: LuaTable, name: string): LuaValue | undefined {
    return table.fields.find(f => String(f.key) === name)?.value
}

function isList(value: LuaValue): value is LuaTable {
    return isTable(value) && value.items.length > 0 && value.fields.length === 0
}

function isKeyed(value: LuaValue): value is LuaTable {
    return isTable(value) && value.fields.length > 0 && value.items.length === 0
}

function everyItem(value: LuaValue, test: (item: LuaTable) => boolean): boolean {
    return isList(value) && value.items.every(item => isTable(item) && test(item))
}

function everyField(value: LuaValue, test: (entry: LuaTable) => boolean): boolean {
    return isKeyed(value) && value.fields.every(f => isTable(f.value) && test(f.value))
}

const weighted = (valueType: 'string' | 'number') => (value: LuaValue) =>
    everyItem(value, item => typeof field(item, 'Value') === valueType && typeof field(item, 'Weight') === 'number')

const loadout = (value: LuaValue) => everyField(value, entry => has(entry, 'Name', 'Passive', 'Active'))

const SHAPES: Partial<Record<GameDatasetKind, (value: LuaValue) => boolean>> = {
    abilities: value =>
        everyField(value, entry => !has(entry, 'Passive')) &&
        (value as LuaTable).fields.some(f => isTable(f.value) && (has(f.value, 'Effects') || has(f.value, 'Params'))),
    physicals: weighted('string'),
    technicals: weighted('string'),
    heights: weighted('number'),
    rarities: value => everyItem(value, item => has(item, 'Name', 'Color', 'Weight', 'Normal')),
    builds: value => everyItem(value, item => has(item, 'Name', 'Rarity', 'Physical', 'Technical')),
    buildPassives: value =>
        everyField(value, entry => entry.items.length === 0 && !has(entry, 'Effects') && !has(entry, 'Params') && !has(entry, 'Name')) &&
        (value as LuaTable).fields.some(f => isTable(f.value) && f.value.fields.some(x => x.value === true)),
    specLoadouts: loadout,
    specLoadoutsPaid: loadout,
    serveStyles: value => isList(value) && value.items.every(item => typeof item === 'string'),
}

export function detectStatement(statement: LuaStatement): Detection {
    const rootKind = statement.target === null ? undefined : kindForRoot(statement.target)
    if (rootKind) return { status: 'root', kind: rootKind, value: statement.value }

    const value = statement.value
    if (isCall(value)) {
        const [name, table] = value.args
        const kind = value.callee === 'Tunables.Define' && typeof name === 'string' ? TUNABLE_DEFINES[name] : undefined
        return kind && table !== undefined ? { status: 'shape', candidates: [kind], value: table } : { status: 'unknown' }
    }

    const candidates = GAME_DATASET_KINDS.filter(kind => SHAPES[kind]?.(value))
    return candidates.length > 0 ? { status: 'shape', candidates, value } : { status: 'unknown' }
}
