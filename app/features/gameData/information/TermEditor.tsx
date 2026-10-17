"use client"

import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { InlineSwitch } from '@/app/components/filters/InlineSwitch'
import { cn } from '@/lib/utils'
import { setTemplateFormat, templateFormat, type NumberFormat } from '@/server/domains/gameData/terms/segments'
import { describeEffectGeneric, renderTemplate, termMap } from '@/server/domains/gameData/terms/template'
import { fmt, humanize, num } from '@/server/domains/gameData/terms/format'
import { normalizeTermDraft, previewTermChange, unseenValue, validateTermDraft } from '@/server/domains/gameData/terms/termEdit'
import { termId } from '@/server/domains/gameData/terms/termUsage'
import type { GameTerm, TermKind } from '@/server/domains/gameData/terms/types'
import type { EffectOp, ScalarValue } from '@/server/domains/gameData/types/datasets'
import { useInformation } from './InformationProvider'
import AbilityPicker from './AbilityPicker'
import SaveControls from './SaveControls'

const FORMAT_OPTIONS: { value: NumberFormat; label: string }[] = [
    { value: 'integer', label: 'Integer' },
    { value: 'decimal', label: 'Decimal' },
    { value: 'percentage', label: 'Percentage' },
]

const SPECIAL_FORMATS: Record<string, string> = {
    inverse: 'Inverse of the game number',
    height: 'Height',
    text: "The game's word, lowercase",
}

interface Draft {
    label: string
    unit: string
    template: string
    grants: string | null
}

function ago(iso: string): string {
    const seconds = (Date.now() - Date.parse(iso)) / 1000
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), 'minute')
    if (seconds < 86400) return rtf.format(-Math.round(seconds / 3600), 'hour')
    return rtf.format(-Math.round(seconds / 86400), 'day')
}

function renderTerm(term: GameTerm, value: ScalarValue, op: EffectOp | undefined): string {
    if (term.template) return renderTemplate(term.template, value)
    if (term.kind === 'effect') return describeEffectGeneric(term.label ?? humanize(term.tag).toLowerCase(), num(value), op ?? 'add', term.unit)
    return value === 1 || value === true ? humanize(term.tag) : `${humanize(term.tag)}: ${value}`
}

function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => ReactNode }) {
    const id = useId()
    return (
        <>
            <label htmlFor={id} className="pt-1.5 text-xs font-semibold text-muted-foreground">{label}</label>
            <div className="min-w-0">
                {children(id)}
                {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
            </div>
        </>
    )
}

const INPUT = 'w-full max-w-xl border-b border-border bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none'

interface TermEditorProps {
    kind: TermKind
    tag: string
    value: ScalarValue
    op?: EffectOp
    size?: 'base' | 'sm'
    editingAbility?: string | null
    startOpen?: boolean
    onDone?: () => void
}

export default function TermEditor({ kind, tag, value, op, size = 'base', editingAbility = null, startOpen = false, onDone }: TermEditorProps) {
    const { terms, usage, abilities, context, userId, saveTerm } = useInformation()
    const term = termMap(terms, kind).get(tag)
    const use = usage.get(termId(kind, tag))
    const effectOp = op ?? use?.op
    const base = useMemo<GameTerm>(() => term ?? { kind, tag, category: 'special', label: null, unit: null, template: null, grants: null, verified: false }, [term, kind, tag])
    const freshDraft = (): Draft => ({
        label: base.label ?? (kind === 'effect' ? humanize(tag).toLowerCase() : ''),
        unit: base.unit ?? '',
        template: base.template ?? '',
        grants: base.grants,
    })

    const [draft, setDraft] = useState<Draft | null>(startOpen ? freshDraft() : null)
    const [saving, setSaving] = useState(false)
    const abilityKeys = useMemo(() => abilities.map(a => a.key), [abilities])

    const draftTerm = useMemo<GameTerm | null>(() => (draft
        ? normalizeTermDraft({
            ...base,
            label: kind === 'effect' ? draft.label : base.label,
            unit: kind === 'effect' ? draft.unit : base.unit,
            template: draft.template,
            grants: kind === 'param' ? draft.grants : base.grants,
        })
        : null), [draft, base, kind])

    const dirty = draftTerm !== null && (!term
        || draftTerm.label !== term.label
        || draftTerm.unit !== term.unit
        || draftTerm.template !== term.template
        || draftTerm.grants !== term.grants)
    const changes = useMemo(() => (dirty && draftTerm ? previewTermChange(abilities, context, draftTerm) : []), [dirty, draftTerm, abilities, context])
    const errors = useMemo(() => (draftTerm ? validateTermDraft(draftTerm, new Set(abilityKeys)) : []), [draftTerm, abilityKeys])
    const unseen = kind !== 'effect' && draftTerm !== null && unseenValue(use, draftTerm.template, value)
    const textClass = size === 'base' ? 'text-base' : 'text-sm'

    function update(next: Partial<Draft>) {
        setDraft(d => (d ? { ...d, ...next } : d))
    }

    function close() {
        setDraft(null)
        onDone?.()
    }

    async function save() {
        if (!draftTerm || !dirty || errors.length > 0 || saving) return
        setSaving(true)
        const ok = await saveTerm({
            kind,
            tag,
            category: draftTerm.category,
            label: draftTerm.label,
            unit: draftTerm.unit,
            template: draftTerm.template,
            grants: draftTerm.grants,
        })
        setSaving(false)
        if (ok) close()
    }

    function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (!draft || event.defaultPrevented) return
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
    }

    if (!draft || !draftTerm) {
        return (
            <p
                role="button"
                tabIndex={0}
                onClick={() => setDraft(freshDraft())}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDraft(freshDraft()) } }}
                className={cn(
                    'mt-0.5 -mx-1 w-fit max-w-full cursor-text rounded-sm px-1 text-foreground transition-colors duration-150 motion-reduce:transition-none',
                    'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                    textClass,
                )}
            >
                {renderTerm(base, value, effectOp)}
            </p>
        )
    }

    const format = draft.template ? templateFormat(draft.template) : null
    const generic = kind === 'effect' ? describeEffectGeneric(draft.label.trim() || humanize(tag).toLowerCase(), num(value), effectOp ?? 'add', draft.unit.trim() || null) : ''
    const shown = typeof value === 'number' ? fmt(value) : String(value)

    return (
        <div onKeyDown={onKeyDown} className="pb-2">
            <p className={cn('mt-0.5 text-foreground', textClass)}>{renderTerm(draftTerm, value, effectOp)}</p>

            <div className="mt-3 grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3">
                {kind === 'effect' && (
                    <>
                        <Field label="Label" hint="Used in the generated wording when Label description is empty.">
                            {id => <input id={id} autoFocus value={draft.label} onChange={e => update({ label: e.target.value })} className={INPUT} />}
                        </Field>
                        <Field label="Unit" hint="Added after the number in the generated wording, like s for seconds.">
                            {id => <input id={id} value={draft.unit} onChange={e => update({ unit: e.target.value })} className={cn(INPUT, 'max-w-24')} />}
                        </Field>
                    </>
                )}
                <Field
                    label="Label description"
                    hint={kind === 'effect'
                        ? `Optional. Empty uses: ${generic}. Write {v} where the game number (${shown}) goes.`
                        : `Write {v} where the game number (${shown}) goes, or leave it out.`}
                >
                    {id => (
                        <input
                            id={id}
                            autoFocus={kind !== 'effect'}
                            value={draft.template}
                            onChange={e => update({ template: e.target.value })}
                            placeholder={kind === 'effect' ? generic : undefined}
                            className={INPUT}
                        />
                    )}
                </Field>
                {format && (
                    <Field label="Number">
                        {() => format.format
                            ? <InlineSwitch<NumberFormat> label="Number format" className="-ml-2" options={FORMAT_OPTIONS} value={format.format} onChange={next => update({ template: setTemplateFormat(draft.template, next, effectOp) })} />
                            : <p className="pt-1.5 text-sm text-muted-foreground">{SPECIAL_FORMATS[format.slot] ?? 'Unknown format'}</p>}
                    </Field>
                )}
                {kind === 'param' && (
                    <Field label="Grants" hint="The ability whose lines this param pulls in.">
                        {() => <AbilityPicker keys={abilityKeys} value={draft.grants} onChange={grants => update({ grants })} />}
                    </Field>
                )}
            </div>

            <div className="mt-3 space-y-3">
                {errors.length > 0 && (
                    <ul role="alert" className="space-y-0.5 text-sm text-destructive">
                        {errors.map(e => <li key={e}>{e}</li>)}
                    </ul>
                )}
                {unseen && <p className="text-sm text-secondary">Value not seen before for this wording. Check it still reads right.</p>}

                <SaveControls
                    tags={tag}
                    dirty={dirty}
                    blocked={errors.length > 0}
                    saving={saving}
                    changes={changes}
                    editing={editingAbility}
                    onSave={() => void save()}
                    onCancel={close}
                />
                <div className="flex flex-wrap items-center gap-3">
                    {term?.updatedBy && term.updatedAt && (
                        <span className="ml-auto text-xs text-muted-foreground">
                            Last edited {ago(term.updatedAt)} by {term.updatedBy === userId ? 'you' : 'another admin'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
