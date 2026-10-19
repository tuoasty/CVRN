import type { Ability, EffectOp } from '../../types/datasets'
import type { AbilityIndexEntry } from '../../types/abilityIndex'
import type { DescriptionSource } from '../../types/schemas'
import type { InspectorData, PublicAbilityKind, SheetRow, TunedInspector } from '../../types/publicInformation'
import type { ResolvedTune } from '../specLoadouts/resolveKit'
import { describeAbility, SKIPPED_OPTIONS, type DescribeContext } from '../../terms/describeAbility'
import { resolveDescriptionSource } from '../../terms/descriptionSource'
import { capitalize, fmt, withUnit } from '../../terms/format'
import { toSlug } from './slug'

export interface InspectorContext {
    context: DescribeContext
    settings: Record<string, DescriptionSource>
}

const EFFECT_AMOUNT = /^Effects\.(\d+)\.Amount$/

export function abilityHref(kind: PublicAbilityKind, slug: string): string {
    return `/information/abilities?type=${kind}&ability=${slug}`
}

export function formatSheetValue(op: EffectOp, amount: number, unit?: string): string {
    if (op === 'scale') return `×${withUnit(amount, unit)}`
    if (op === 'set') return withUnit(amount, unit)
    return `${amount < 0 ? '-' : '+'}${withUnit(Math.abs(amount), unit)}`
}

function hasOptions(options: Record<string, unknown> | undefined): boolean {
    return Object.keys(options ?? {}).some(key => !SKIPPED_OPTIONS.has(key))
}

function statSheet(ability: Ability, context: DescribeContext): SheetRow[] | undefined {
    if (ability.effects.length === 0) return undefined
    if (Object.keys(ability.params).length > 0 || ability.active || ability.toggle) return undefined
    if ((ability.team?.length ?? 0) > 0 || (ability.aura?.length ?? 0) > 0) return undefined

    const rows: SheetRow[] = []
    for (const effect of ability.effects) {
        const term = context.terms.effects.get(effect.tag)
        if (!term?.label || hasOptions(effect.options)) return undefined
        const unit = term.unit ?? undefined
        const row: SheetRow = { label: capitalize(term.label), value: formatSheetValue(effect.op, effect.amount, unit), op: effect.op }
        if (unit) row.unit = unit
        rows.push(row)
    }
    return rows
}

export function buildInspector(ability: Ability, entry: AbilityIndexEntry | undefined, ctx: InspectorContext): InspectorData {
    const kind = entry?.availability ?? 'exclusive'
    const data: InspectorData = { key: ability.key, name: ability.key, kind }
    if (kind !== 'exclusive') {
        if (entry?.rarity) data.rarity = entry.rarity
        data.href = abilityHref(kind, toSlug(ability.key))
    }

    const sheet = statSheet(ability, ctx.context)
    if (sheet) {
        data.sheet = sheet
        return data
    }

    const { source } = resolveDescriptionSource(ability, ctx.settings[ability.key])
    if (source === 'original' && ability.description) data.text = ability.description
    else data.lines = describeAbility(ability, ctx.context).map(b => b.text)
    return data
}

export function applyTunes(data: InspectorData, tunes: ResolvedTune[]): TunedInspector {
    const sheet = data.sheet?.map(row => ({ ...row }))
    const tuned: string[] = []

    for (const tune of tunes) {
        const match = EFFECT_AMOUNT.exec(tune.path)
        const row = match && sheet ? sheet[Number(match[1]) - 1] : undefined
        if (row) {
            row.was = row.value
            row.value = formatSheetValue(row.op, tune.value, row.unit)
            continue
        }
        tuned.push(tune.before === null ? `${tune.label} ${fmt(tune.value)}` : `${tune.label} ${fmt(tune.before)} → ${fmt(tune.value)}`)
    }

    const result: TunedInspector = { ...data }
    if (sheet) result.sheet = sheet
    if (tuned.length > 0) result.tuned = tuned
    return result
}
