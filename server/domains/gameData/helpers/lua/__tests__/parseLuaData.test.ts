import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseLuaData } from '../parseLuaData'
import { tokenize } from '../tokenize'
import type { LuaStatement, LuaTable } from '../../../types/luaValue'

const fixture = (name: string) => readFileSync(join(__dirname, '../../../__tests__/fixtures', name), 'utf8')

function parseOk(text: string): LuaStatement[] {
    const result = parseLuaData(text)
    if (!result.ok) throw new Error(`${result.error.message} at ${result.error.line}:${result.error.column}`)
    return result.value
}

function valueOf(text: string) {
    return parseOk(`X = ${text}`)[0].value
}

describe('tokenize', () => {
    it('reads escapes, long strings and skips comments', () => {
        const tokens = tokenize('-- note\n"a\\"b\\n" [==[\nline]] ]==] --[[ block\n]] \'it\\\'s\'')
        expect(tokens.filter(t => t.type === 'string').map(t => t.value)).toEqual(['a"b\n', 'line]] ', "it's"])
    })

    it('tracks lines across comments and long strings', () => {
        const tokens = tokenize('--[[\n\n]]\nx')
        expect(tokens[0]).toMatchObject({ value: 'x', line: 4, column: 1 })
    })

    it('reads hex, exponent, leading-dot and underscore numbers', () => {
        const nums = tokenize('0x1F 1e3 .5 1_000').filter(t => t.type === 'number').map(t => t.number)
        expect(nums).toEqual([31, 1000, 0.5, 1000])
    })
})

describe('parseLuaData', () => {
    it('parses keyed, bracketed and positional table fields in order', () => {
        const value = valueOf('{ A = 1, ["B C"] = "x", 3, [4] = true, }') as LuaTable
        expect(value.items).toEqual([3])
        expect(value.fields).toEqual([
            { key: 'A', value: 1 },
            { key: 'B C', value: 'x' },
            { key: 4, value: true },
        ])
    })

    it('folds arithmetic with Lua precedence', () => {
        expect(valueOf('1 / 24')).toBeCloseTo(1 / 24)
        expect(valueOf('0.35 / 3')).toBeCloseTo(0.35 / 3)
        expect(valueOf('-2 ^ 2')).toBe(-4)
        expect(valueOf('1 + 2 * 3')).toBe(7)
        expect(valueOf('(1 + 2) * 3')).toBe(9)
        expect(valueOf('"a" .. 1 .. "b"')).toBe('a1b')
    })

    it('keeps calls and references as data', () => {
        expect(valueOf('add("JumpSpeed", 0.8, { ShortBonus = true })')).toEqual({
            kind: 'call',
            callee: 'add',
            args: ['JumpSpeed', 0.8, { kind: 'table', items: [], fields: [{ key: 'ShortBonus', value: true }] }],
        })
        expect(valueOf('Color3.fromRGB(1, 2, 3)')).toMatchObject({ kind: 'call', callee: 'Color3.fromRGB', args: [1, 2, 3] })
        expect(valueOf('Enum.Rarity.Mythic')).toEqual({ kind: 'ref', path: 'Enum.Rarity.Mythic' })
    })

    it('skips Luau type assertions and annotations', () => {
        const statements = parseOk([
            'A.B = { 1 } :: { [string]: Ability }',
            'A.C = {} :: { Weighted<Physical> }',
            'local D: { [string]: number }? = { x = 1 }',
            'A.E = (5 :: number)',
        ].join('\n'))
        expect(statements.map(s => s.target)).toEqual(['A.B', 'A.C', 'D', 'A.E'])
        expect(statements[3].value).toBe(5)
    })

    it('records statement line and source', () => {
        const statements = parseOk('\nA.B = {\n  1,\n} :: { T }\nreturn A')
        expect(statements).toHaveLength(2)
        expect(statements[0].line).toBe(2)
        expect(statements[0].source).toBe('A.B = {\n  1,\n} :: { T }')
    })

    it('keeps a return statement with a null target', () => {
        const statements = parseOk('return { A = 1 }')
        expect(statements).toMatchObject([{ target: null, line: 1, value: { kind: 'table' } }])
        expect(statements[0].source).toBe('return { A = 1 }')
    })

    it('keeps parsing after a return so joined files yield every statement', () => {
        const statements = parseOk('return { 1 }\n\nX.Y = { 2 }\n\nreturn { 3 }')
        expect(statements.map(s => s.target)).toEqual([null, 'X.Y', null])
    })

    it('keeps a returned call', () => {
        const statements = parseOk('return Tunables.Define("Style", { CurveballSide = 1 })')
        expect(statements[0].value).toMatchObject({ kind: 'call', callee: 'Tunables.Define' })
    })

    it('skips a bare return', () => {
        expect(parseOk('return')).toEqual([])
    })

    it('reports the line and column of a syntax error', () => {
        const result = parseLuaData('A = {\n  B = 1\n  C = 2\n}')
        expect(result.ok).toBe(false)
        if (result.ok) return
        expect(result.error).toMatchObject({ line: 3, column: 3, lineText: '  C = 2' })
    })

    it('rejects code that is not data', () => {
        const fn = parseLuaData('A = function() end')
        const expr = parseLuaData('A = x + 1')
        expect(fn.ok).toBe(false)
        expect(expr.ok).toBe(false)
    })

    it('parses every real fixture', () => {
        expect(parseOk(fixture('rarities.txt')).map(s => s.target)).toEqual(['RollCatalog.Rarities'])
        expect(parseOk(fixture('attributes.txt')).map(s => s.target)).toEqual(['Attributes.Physicals', 'Attributes.Technicals'])
        const abilities = parseOk(fixture('abilities.txt'))
        expect(abilities.map(s => s.target)).toEqual(['AbilityCatalog.Abilities'])
        expect((abilities[0].value as LuaTable).fields.length).toBeGreaterThan(200)
    })
})
