import { describe, expect, it } from 'vitest'
import { parseLuaData } from '../../lua/parseLuaData'
import { detectStatement } from '../detectKind'
import { fixtureText } from '../../../__tests__/fixtures/loadFixtures'
import type { LuaStatement } from '../../../types/luaValue'

function first(text: string): LuaStatement {
    const parsed = parseLuaData(text)
    if (!parsed.ok) throw new Error(parsed.error.message)
    return parsed.value[0]
}

const asReturn = (file: string) => fixtureText(file).replace(/^[\w.]+\s*=/, 'return')

describe('detectStatement', () => {
    it.each([
        ['abilities.txt', 'abilities'],
        ['attributes.txt', 'physicals'],
        ['heights.txt', 'heights'],
        ['rarities.txt', 'rarities'],
        ['builds.txt', 'builds'],
        ['build-passives.txt', 'buildPassives'],
        ['serve-styles.txt', 'serveStyles'],
    ])('detects the root of %s', (file, kind) => {
        expect(detectStatement(first(fixtureText(file)))).toMatchObject({ status: 'root', kind })
    })

    it('reads the Style tunables call and unwraps its table', () => {
        expect(detectStatement(first(fixtureText('serve-style-values.txt')))).toMatchObject({
            status: 'shape',
            candidates: ['serveStyleValues'],
            value: { kind: 'table' },
        })
    })

    it.each(['spec-loadouts.txt', 'spec-loadouts-paid.txt'])('asks League or Custom for %s', file => {
        expect(detectStatement(first(fixtureText(file)))).toMatchObject({ status: 'shape', candidates: ['specLoadouts', 'specLoadoutsPaid'] })
    })

    it.each([
        ['abilities.txt', ['abilities']],
        ['heights.txt', ['heights']],
        ['rarities.txt', ['rarities']],
        ['builds.txt', ['builds']],
        ['build-passives.txt', ['buildPassives']],
        ['serve-styles.txt', ['serveStyles']],
    ])('detects %s as a return file by shape', (file, candidates) => {
        expect(detectStatement(first(asReturn(file)))).toMatchObject({ status: 'shape', candidates })
    })

    it('asks Physicals or Technicals for a returned attribute list', () => {
        expect(detectStatement(first(asReturn('attributes.txt')))).toMatchObject({ status: 'shape', candidates: ['physicals', 'technicals'] })
    })

    it('detects an unknown root by shape', () => {
        expect(detectStatement(first('Other.Heights = { { Value = 1.5, Weight = 2 } }'))).toMatchObject({ status: 'shape', candidates: ['heights'] })
    })

    it('returns unknown for an unrecognized shape', () => {
        expect(detectStatement(first('return { 1, 2 }'))).toEqual({ status: 'unknown' })
    })

    it('returns unknown for an empty table', () => {
        expect(detectStatement(first('return {}'))).toEqual({ status: 'unknown' })
    })

    it('returns unknown for an unknown Tunables.Define name', () => {
        expect(detectStatement(first('return Tunables.Define("Spin", { A = 1 })'))).toEqual({ status: 'unknown' })
    })
})
