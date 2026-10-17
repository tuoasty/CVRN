import type { EffectOp, ScalarValue } from '../types/datasets'
import type { GameTerm, TermKind } from './types'
import { capitalize, humanize } from './format'
import { renderTemplate } from './template'

export type TemplateSegment = { kind: 'text'; text: string } | { kind: 'slot'; name: string }

export const VERB_SLOTS = ['change', 'scaleChange'] as const
export const VALUE_SLOTS = ['v', 'abs', 'pct', 'pctChange', 'inverse', 'height'] as const

const SLOT = /\{(\w+)\}/g

export function parseTemplate(template: string): TemplateSegment[] {
    const segments: TemplateSegment[] = []
    let last = 0
    for (const match of template.matchAll(SLOT)) {
        if (match.index > last) segments.push({ kind: 'text', text: template.slice(last, match.index) })
        segments.push({ kind: 'slot', name: match[1] })
        last = match.index + match[0].length
    }
    if (last < template.length) segments.push({ kind: 'text', text: template.slice(last) })
    return segments
}

export function joinSegments(segments: TemplateSegment[]): string {
    return segments.map(s => (s.kind === 'text' ? s.text : `{${s.name}}`)).join('')
}

export function materializeEffectTemplate(op: EffectOp, label: string, unit: string | null): string {
    if (op === 'set') return `${capitalize(label)} set to {v}${unit ?? ''}`
    if (op === 'scale') return `{scaleChange} ${label} by {pctChange}%`
    return `{change} ${label} by {abs}${unit ?? ''}`
}

const MARK = '\u0000'

export function effectTermFields(template: string, op: EffectOp, unit: string | null, currentLabel: string): { label: string; template: string | null } {
    const [prefix, suffix] = materializeEffectTemplate(op, MARK, unit).split(MARK)
    const body = template.slice(prefix.length, template.length - suffix.length)
    const labelOnly = template.length >= prefix.length + suffix.length
        && template.startsWith(prefix)
        && template.endsWith(suffix)
        && body.trim() !== ''
        && !body.includes('{')
    if (!labelOnly) return { label: currentLabel, template }
    return { label: op === 'set' ? body.charAt(0).toLowerCase() + body.slice(1) : body, template: null }
}

export function editableTemplate(kind: TermKind, tag: string, term: GameTerm | undefined, value: ScalarValue, op?: EffectOp): string {
    if (term?.template) return term.template
    if (kind === 'effect') return materializeEffectTemplate(op ?? 'add', term?.label ?? humanize(tag).toLowerCase(), term?.unit ?? null)
    const slot = typeof value === 'string' ? '{text}' : '{v}'
    if (kind === 'option') return `${humanize(tag).toLowerCase()}: ${slot}`
    return value === 1 || value === true ? humanize(tag) : `${humanize(tag)}: ${slot}`
}

export type NumberFormat = 'integer' | 'decimal' | 'percentage'

export type EditPart =
    | { kind: 'text'; text: string; verb?: { slot: string; word: string } }
    | { kind: 'value'; slot: string }

const FORMAT_OF_SLOT: Record<string, NumberFormat> = {
    int: 'integer',
    v: 'decimal',
    abs: 'decimal',
    pct: 'percentage',
    pctChange: 'percentage',
}

export function formatOfSlot(slot: string): NumberFormat | null {
    return FORMAT_OF_SLOT[slot] ?? null
}

export function slotForFormat(format: NumberFormat, current: string, op?: EffectOp): string {
    if (format === 'integer') return 'int'
    if (format === 'percentage') return op === 'scale' || current === 'pctChange' ? 'pctChange' : 'pct'
    return current === 'v' ? 'v' : 'abs'
}

export function toEditParts(template: string, value: ScalarValue): EditPart[] {
    const parts: EditPart[] = []
    let verb: { slot: string; word: string } | undefined
    const pushText = (text: string) => {
        const last = parts[parts.length - 1]
        if (last?.kind === 'text') last.text += text
        else parts.push({ kind: 'text', text })
    }
    for (const segment of parseTemplate(template)) {
        if (segment.kind === 'slot' && (VERB_SLOTS as readonly string[]).includes(segment.name)) {
            verb = { slot: segment.name, word: renderTemplate(`{${segment.name}}`, value) }
            parts.push({ kind: 'text', text: verb.word, verb })
        } else if (segment.kind === 'slot') {
            parts.push({ kind: 'value', slot: segment.name })
        } else {
            const previous = parts[parts.length - 1]
            const text = previous?.kind === 'value' && previous.slot === 'pctChange' && segment.text.startsWith('%') ? segment.text.slice(1) : segment.text
            if (text) pushText(text)
        }
    }
    return parts
}

export function fromEditParts(parts: EditPart[]): string {
    return parts.map(part => {
        if (part.kind === 'value') return part.slot === 'pctChange' ? '{pctChange}%' : `{${part.slot}}`
        if (part.verb && part.text.startsWith(part.verb.word)) return `{${part.verb.slot}}${part.text.slice(part.verb.word.length)}`
        return part.text
    }).join('')
}

export function renderValue(slot: string, value: ScalarValue): string {
    return renderTemplate(slot === 'pctChange' ? '{pctChange}%' : `{${slot}}`, value)
}

export function templateFormat(template: string): { slot: string; format: NumberFormat | null } | null {
    const part = toEditParts(template, 1).find(p => p.kind === 'value')
    return part?.kind === 'value' ? { slot: part.slot, format: formatOfSlot(part.slot) } : null
}

export function setTemplateFormat(template: string, format: NumberFormat, op?: EffectOp): string {
    const parts = toEditParts(template, 1)
    const at = parts.findIndex(p => p.kind === 'value')
    if (at === -1) return template
    const current = parts[at]
    if (current.kind !== 'value') return template
    parts[at] = { kind: 'value', slot: slotForFormat(format, current.slot, op) }
    return fromEditParts(parts)
}
