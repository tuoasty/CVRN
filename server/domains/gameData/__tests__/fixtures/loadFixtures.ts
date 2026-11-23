import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildImportPreview, type KindChoices } from '../../helpers/buildImportPreview'
import { createTermBook } from '../../terms/template'
import type { Ability, GameDatasetKind, GameDatasetPayloads, SpecLoadout } from '../../types/datasets'
import type { GameTerm, TermBook } from '../../terms/types'

export function fixtureAbilities(): Ability[] {
    const preview = buildImportPreview(readFileSync(join(__dirname, 'abilities.txt'), 'utf8'))
    if (preview.status !== 'ok') throw new Error('fixture failed to parse')
    return preview.datasets[0].payload as Ability[]
}

export function fixtureText(name: string): string {
    return readFileSync(join(__dirname, name), 'utf8')
}

export function fixtureSpecLoadouts(): SpecLoadout[] {
    return fixtureDataset('spec-loadouts.txt', 'specLoadouts', { 1: 'specLoadouts' })
}

export function fixtureTerms(): TermBook {
    return createTermBook(JSON.parse(readFileSync(join(__dirname, 'terms.json'), 'utf8')) as GameTerm[])
}

export function fixtureDataset<K extends GameDatasetKind>(file: string, kind: K, choices: KindChoices = {}): GameDatasetPayloads[K] {
    const preview = buildImportPreview(fixtureText(file), {}, undefined, [], new Set(), choices)
    if (preview.status !== 'ok') throw new Error(`${file} failed to parse`)
    const dataset = preview.datasets.find(d => d.kind === kind)
    if (!dataset) throw new Error(`${file} has no ${kind}`)
    return dataset.payload as GameDatasetPayloads[K]
}
