export type LuaValue = string | number | boolean | null | LuaTable | LuaCall | LuaRef

export interface LuaField {
    key: string | number
    value: LuaValue
}

export interface LuaTable {
    kind: 'table'
    items: LuaValue[]
    fields: LuaField[]
}

export interface LuaCall {
    kind: 'call'
    callee: string
    args: LuaValue[]
}

export interface LuaRef {
    kind: 'ref'
    path: string
}

export interface LuaStatement {
    target: string
    value: LuaValue
    line: number
    source: string
}

export interface LuaParseError {
    message: string
    line: number
    column: number
    lineText: string
}
