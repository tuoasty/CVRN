import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildImportPreview, type KindChoice, type KindChoices } from '../buildImportPreview'
import type { GameDataPreview, PreviewDataset } from '../../types/preview'

const fixture = (name: string) => readFileSync(join(__dirname, '../../__tests__/fixtures', name), 'utf8')
const ALL = [fixture('rarities.txt'), fixture('abilities.txt'), fixture('attributes.txt')].join('\n\n')

function okPreview(text: string, choices: KindChoices = {}): Extract<GameDataPreview, { status: 'ok' }> {
    const preview = buildImportPreview(text, {}, undefined, [], new Set(), choices)
    if (preview.status !== 'ok') throw new Error(preview.error.message)
    return preview
}

function choose(text: string, picks: KindChoice[]) {
    const lines = okPreview(text).pending.map(p => p.line)
    return okPreview(text, Object.fromEntries(lines.map((line, i) => [line, picks[i]])))
}

function dataset<K extends PreviewDataset['kind']>(preview: Extract<GameDataPreview, { status: 'ok' }>, kind: K) {
    return preview.datasets.find(d => d.kind === kind) as Extract<PreviewDataset, { kind: K }>
}

describe('buildImportPreview with heights and builds', () => {
    it('imports heights, builds and build effects alongside the catalog with no issues', () => {
        const preview = okPreview([ALL, fixture('heights.txt'), fixture('builds.txt'), fixture('build-passives.txt')].join('\n\n'))
        expect(preview.datasets.slice(4).map(d => [d.kind, d.count])).toEqual([
            ['heights', 24],
            ['builds', 52],
            ['buildPassives', 51],
        ])
        expect(preview.datasets.flatMap(d => d.issues)).toEqual([])
        expect(preview.crossIssues).toEqual([])
        expect(preview.canPublish).toBe(true)
    })
})

describe('buildImportPreview with the real files', () => {
    const preview = okPreview(ALL)

    it('detects all four datasets with no issues', () => {
        expect(preview.datasets.map(d => [d.kind, d.count])).toEqual([
            ['rarities', 4],
            ['abilities', dataset(preview, 'abilities').count],
            ['physicals', 24],
            ['technicals', 41],
        ])
        expect(preview.datasets.flatMap(d => d.issues)).toEqual([])
        expect(preview.crossIssues).toEqual([])
        expect(preview.ignored).toEqual([])
        expect(preview.canPublish).toBe(true)
    })

    it('converts rarity colors to hex', () => {
        expect(dataset(preview, 'rarities').payload[0]).toEqual({
            name: 'Common', color: '#a9b7ca', weight: 30, normalPct: 50, luckyPct: 0,
        })
    })

    it('normalizes abilities in source order', () => {
        const abilities = dataset(preview, 'abilities').payload
        expect(abilities[0].key).toBe('Bounce')
        const byKey = new Map(abilities.map(a => [a.key, a]))

        expect(byKey.get('Bounce')).toMatchObject({
            group: 'JumpTrait',
            effects: [{ op: 'add', tag: 'JumpSpeed', amount: 0.8, options: { ShortBonus: true } }],
        })
        expect(byKey.get('No Pressure')!.params.PressureRate).toBeCloseTo(1 / 20)
        expect(byKey.get('Lockdown')!.active).toEqual({ cooldown: 300, duration: 60, behaviour: 'Lockdown' })
        expect(byKey.get('Flexible Wrists')!.toggle).toEqual({ name: 'FlexibleWrists', defaultOn: true })
        expect(byKey.get('V Blocker')!.toggle).toEqual({ name: 'VBlock', defaultOn: false })
        expect(byKey.get('Special - Leader')!.team).toEqual(["Leader's Power", "Leader's Jump"])
        expect(byKey.get('Special - No One Left Behind')!.aura).toEqual(['+0.25 Block Width'])
        expect(byKey.get('Brotherhood Boost')).toEqual({ key: 'Brotherhood Boost', effects: [], params: {} })
    })
})

describe('buildImportPreview issues', () => {
    it('returns a parse error with position', () => {
        const preview = buildImportPreview('RollCatalog.Rarities = {\n  { Name = "A" \n')
        expect(preview.status).toBe('parse_error')
    })

    it('reports unknown roots as ignored', () => {
        const preview = okPreview('Foo.Bar = {}')
        expect(preview.ignored).toEqual([{ target: 'Foo.Bar', line: 1 }])
        expect(preview.canPublish).toBe(false)
    })

    it('keeps unknown ability fields as extra with a warning', () => {
        const preview = okPreview('AbilityCatalog.Abilities = { X = { Shiny = 2, Description = "d" } }')
        const abilities = dataset(preview, 'abilities')
        expect(abilities.payload[0].extra).toEqual({ Shiny: 2 })
        expect(abilities.issues).toEqual([{ level: 'warning', kind: 'abilities', entry: 'X', message: "Unknown field 'Shiny', kept as extra" }])
        expect(preview.canPublish).toBe(true)
    })

    it('blocks publish on a malformed effect', () => {
        const preview = okPreview('AbilityCatalog.Abilities = { X = { Effects = { boost("A", 1) } } }')
        expect(preview.canPublish).toBe(false)
        expect(dataset(preview, 'abilities').issues[0].level).toBe('error')
    })

    it('cross-checks rollables against the catalog and rarity weights', () => {
        const preview = okPreview([
            'RollCatalog.Rarities = { { Name = "C", Color = Color3.fromRGB(0,0,0), Weight = 30, Normal = 100, Lucky = 100 } }',
            'AbilityCatalog.Abilities = { Bounce = {} }',
            'Attributes.Physicals = { { Value = "Bounce", Weight = 30 }, { Value = "Ghost", Weight = 7 }, { Value = "None", Weight = 30 } }',
        ].join('\n'))
        expect(preview.crossIssues.map(i => `${i.entry}: ${i.message}`)).toEqual([
            'Ghost: Rollable but missing from the ability catalog',
            'Ghost: Weight 7 matches no rarity',
        ])
    })

    it('uses stored datasets for cross-checks when the paste lacks them', () => {
        const preview = buildImportPreview('Attributes.Physicals = { { Value = "Ghost", Weight = 30 } }', {
            abilities: [{ key: 'Bounce', effects: [], params: {} }],
        })
        expect(preview.status === 'ok' && preview.crossIssues[0].entry).toBe('Ghost')
    })

    it('flags a dataset assigned twice', () => {
        const preview = okPreview('Attributes.Physicals = {}\nAttributes.Physicals = {}')
        expect(preview.canPublish).toBe(false)
    })
})

describe('buildImportPreview with spec loadouts', () => {
    it('reads the spec catalog with the abilities in the same paste', () => {
        const preview = choose([fixture('abilities.txt'), fixture('spec-loadouts.txt')].join('\n\n'), ['specLoadouts'])
        const loadouts = dataset(preview, 'specLoadouts')
        expect([loadouts.root, loadouts.count]).toEqual([null, 58])
        expect(loadouts.issues.map(i => i.message)).toHaveLength(7)
        expect(loadouts.issues.every(i => i.level === 'warning' && /^Tune path Params\.\w+ is not supported/.test(i.message))).toBe(true)
        expect(preview.canPublish).toBe(true)
    })

    it('warns about tunes that do not match the kit', () => {
        const abilities = okPreview(fixture('abilities.txt'))
        const stored = { abilities: dataset(abilities, 'abilities').payload }
        const text = 'SpecCatalog.Specs = { A = { Name = "A", Height = 1.3, Cooldown = 1, EndOnSpike = false, MaxPower = 1, ActiveMaxPower = 1, Passive = { "Bounce" }, Active = {}, Tuning = { tune("Active", "Bounce", "Effects.1.Amount", 1) } } }'
        const preview = buildImportPreview(text, stored)
        if (preview.status !== 'ok') throw new Error('parse')
        expect(dataset(preview, 'specLoadouts').issues.map(i => i.message)).toEqual(['Tunes "Bounce" but it is not in the Active kit'])
    })
})

describe('buildImportPreview spec links', () => {
    it('plans links when the paste has spec loadouts', () => {
        const preview = okPreview(fixture('spec-loadouts.txt'), { 1: 'specLoadouts' })
        expect(preview.specLinks?.items).toHaveLength(58)
        expect(preview.specLinks?.items.every(i => i.status === 'ambiguous')).toBe(true)
        expect(preview.canPublish).toBe(true)
    })

    it('proposes exact matches against DB specs', () => {
        const parsed = buildImportPreview(fixture('spec-loadouts.txt'), {}, undefined, [
            { id: 'a', name: 'Wilfredo León', stars: 5, position: 'OUT', height: 79, game_key: null, is_custom: false },
        ], new Set(), { 1: 'specLoadouts' })
        if (parsed.status !== 'ok') throw new Error('parse')
        expect(parsed.specLinks?.items.find(i => i.gameKey === 'Wilfredo Leon')).toMatchObject({ status: 'exact', specId: 'a', height: 79 })
    })

    it('has no link step without spec loadouts', () => {
        expect(okPreview(fixture('rarities.txt')).specLinks).toBeNull()
    })
})

const EVERY_FILE = [
    'abilities.txt', 'attributes.txt', 'heights.txt', 'rarities.txt', 'builds.txt', 'build-passives.txt',
    'serve-styles.txt', 'serve-style-values.txt', 'spec-loadouts.txt', 'spec-loadouts-paid.txt',
].map(fixture).join('\n\n')

describe('buildImportPreview detection', () => {
    it('places every real file and leaves the two loadout files pending', () => {
        const preview = okPreview(EVERY_FILE)
        expect(preview.pending.map(p => p.candidates)).toEqual([['specLoadouts', 'specLoadoutsPaid'], ['specLoadouts', 'specLoadoutsPaid']])
        expect(preview.canPublish).toBe(false)
        expect(preview.datasets.map(d => d.kind)).toEqual(expect.arrayContaining(['serveStyles', 'serveStyleValues']))
        expect(preview.ignored).toEqual([])
    })

    it('publishes once both loadout files are chosen', () => {
        const preview = choose(EVERY_FILE, ['specLoadouts', 'specLoadoutsPaid'])
        expect(preview.pending).toEqual([])
        expect(dataset(preview, 'specLoadoutsPaid').alternatives).toEqual(['specLoadouts'])
        expect(dataset(preview, 'serveStyleValues').alternatives).toEqual([])
        expect(preview.crossIssues.filter(i => i.level === 'error')).toEqual([])
    })

    it('errors when both loadout files are chosen as League', () => {
        const preview = choose(EVERY_FILE, ['specLoadouts', 'specLoadouts'])
        expect(preview.crossIssues).toContainEqual(expect.objectContaining({ level: 'error', message: expect.stringContaining('Spec loadouts is assigned more than once') }))
        expect(preview.canPublish).toBe(false)
    })

    it('rejects a choice whose kind is not a candidate', () => {
        const preview = okPreview(fixture('spec-loadouts.txt'), { 1: 'abilities' })
        expect(preview.crossIssues).toContainEqual(expect.objectContaining({ level: 'error', message: 'Line 1 cannot be read as Abilities' }))
        expect(preview.canPublish).toBe(false)
    })

    it('rejects a choice on a root-detected line', () => {
        const preview = okPreview(fixture('heights.txt'), { 1: 'physicals' })
        expect(preview.crossIssues).toContainEqual(expect.objectContaining({ level: 'error', message: 'Line 1 cannot be read as Physicals' }))
        expect(dataset(preview, 'heights').alternatives).toEqual([])
    })

    it('rejects a choice on a line with no statement', () => {
        const preview = okPreview(fixture('heights.txt'), { 99: 'heights' })
        expect(preview.crossIssues).toContainEqual(expect.objectContaining({ level: 'error', message: 'Line 99 cannot be read as Heights' }))
    })

    it('moves a skipped statement to ignored', () => {
        const preview = okPreview(fixture('spec-loadouts.txt'), { 1: 'skip' })
        expect(preview.pending).toEqual([])
        expect(preview.ignored).toEqual([{ target: null, line: 1 }])
        expect(preview.datasets).toEqual([])
    })

    it('reassigns a returned attribute list', () => {
        const text = fixture('attributes.txt').split('Attributes.Technicals')[0].replace(/^[\w.]+\s*=/, 'return')
        expect(okPreview(text).pending).toEqual([{ line: 1, candidates: ['physicals', 'technicals'] }])
        const preview = okPreview(text, { 1: 'technicals' })
        expect(preview.datasets).toHaveLength(1)
        expect(preview.datasets[0]).toMatchObject({ kind: 'technicals', alternatives: ['physicals'] })
    })

    it('does not check spec styles when serve styles are neither pasted nor stored', () => {
        const preview = okPreview(fixture('spec-loadouts.txt'), { 1: 'specLoadouts' })
        expect([...preview.crossIssues, ...preview.datasets.flatMap(d => d.issues)].filter(i => i.message.startsWith('Unknown serve style'))).toEqual([])
    })
})
