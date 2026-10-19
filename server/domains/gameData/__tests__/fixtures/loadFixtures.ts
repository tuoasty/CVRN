import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildImportPreview } from '../../helpers/buildImportPreview'
import { createTermBook } from '../../terms/template'
import type { Ability, SpecLoadout } from '../../types/datasets'
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
    const preview = buildImportPreview(fixtureText('spec-loadouts.txt'))
    if (preview.status !== 'ok') throw new Error('fixture failed to parse')
    return preview.datasets[0].payload as SpecLoadout[]
}

export function fixtureTerms(): TermBook {
    return createTermBook(JSON.parse(readFileSync(join(__dirname, 'terms.json'), 'utf8')) as GameTerm[])
}
