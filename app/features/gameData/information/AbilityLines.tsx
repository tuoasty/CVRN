"use client"

import Link from 'next/link'
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { InlineSwitch } from '@/app/components/filters/InlineSwitch'
import { cn } from '@/lib/utils'
import { describeAbility, SKIPPED_OPTIONS } from '@/server/domains/gameData/terms/describeAbility'
import { fmt, humanize } from '@/server/domains/gameData/terms/format'
import { setTemplateFormat, templateFormat, type NumberFormat } from '@/server/domains/gameData/terms/segments'
import { describeEffectGeneric, termMap } from '@/server/domains/gameData/terms/template'
import { withDrafts } from '@/server/domains/gameData/terms/termEdit'
import { isTermHandled } from '@/server/domains/gameData/terms/termUsage'
import type { TermBook, TermKind } from '@/server/domains/gameData/terms/types'
import type { Ability, AbilityEffect, ScalarValue } from '@/server/domains/gameData/types/datasets'
import { useInformation } from './InformationProvider'
import { useTermDrafts, type TermDrafts } from './useTermDrafts'
import AbilityPicker from './AbilityPicker'
import SaveControls from './SaveControls'
import { abilityHref } from './abilityLinks'

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

const FIELD_INPUT = 'w-full border-b border-border bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none'

const show = (value: ScalarValue) => (typeof value === 'number' ? fmt(value) : String(value))

interface Part {
    kind: TermKind
    tag: string
    value: ScalarValue
    op?: AbilityEffect['op']
}

function useFlagged(parts: Part[]): boolean {
    const { terms } = useInformation()
    return parts.some(p => !isTermHandled(terms, p.kind, p.tag) || termMap(terms, p.kind).get(p.tag)?.verified === false)
}

function Dot({ label }: { label: string }) {
    return (
        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-secondary align-middle">
            <span className="sr-only">{label}</span>
        </span>
    )
}

function Labeled({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
    return (
        <label className={cn('flex min-w-0 flex-col', className)}>
            <span className="text-xs font-semibold text-muted-foreground">{label}</span>
            {children}
        </label>
    )
}

function PartFields({ part, drafts }: { part: Part; drafts: TermDrafts }) {
    const { terms, abilities } = useInformation()
    const { kind, tag, value, op } = part
    const term = drafts.termFor(kind, tag)
    const flagged = useFlagged([part])
    const format = term.template ? templateFormat(term.template) : null
    const abilityKeys = useMemo(() => abilities.map(a => a.key), [abilities])
    const generic = kind === 'effect'
        ? describeEffectGeneric(term.label?.trim() || humanize(tag).toLowerCase(), Number(value), op ?? 'add', term.unit?.trim() || null)
        : ''
    const status = !isTermHandled(terms, kind, tag) ? 'Not handled' : 'Unverified'

    return (
        <div className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] gap-x-4 py-2.5">
            <div className="min-w-0 pt-4">
                <p className="flex items-center gap-2 font-mono text-xs text-foreground">
                    <span className="truncate">{tag}</span>
                    {flagged && <Dot label={status} />}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{kind} {show(value)}</p>
            </div>
            <div className="flex min-w-0 flex-wrap items-end gap-x-5 gap-y-2">
                {kind === 'effect' && (
                    <Labeled label="Label" className="w-48">
                        <input value={term.label ?? ''} onChange={e => drafts.edit(kind, tag, { label: e.target.value })} className={FIELD_INPUT} />
                    </Labeled>
                )}
                {kind === 'effect' && (
                    <Labeled label="Unit" className="w-14">
                        <input value={term.unit ?? ''} onChange={e => drafts.edit(kind, tag, { unit: e.target.value })} className={FIELD_INPUT} />
                    </Labeled>
                )}
                <Labeled label={kind === 'effect' ? 'Label description (optional)' : 'Label description'} className="min-w-[16rem] flex-1">
                    <input
                        value={term.template ?? ''}
                        onChange={e => drafts.edit(kind, tag, { template: e.target.value })}
                        placeholder={kind === 'effect' ? generic : humanize(tag)}
                        title={`Write {v} where the game number (${show(value)}) goes`}
                        className={FIELD_INPUT}
                    />
                </Labeled>
                {format && (
                    <div className="flex min-w-0 flex-col">
                        <span className="text-xs font-semibold text-muted-foreground">Number</span>
                        {format.format
                            ? (
                                <InlineSwitch<NumberFormat>
                                    label="Number format"
                                    className="-ml-2"
                                    options={FORMAT_OPTIONS}
                                    value={format.format}
                                    onChange={next => drafts.edit(kind, tag, { template: setTemplateFormat(term.template ?? '', next, op) })}
                                />
                            )
                            : <span className="py-1 text-sm text-muted-foreground">{SPECIAL_FORMATS[format.slot] ?? 'Unknown format'}</span>}
                    </div>
                )}
                {kind === 'param' && (
                    <div className="flex min-w-[16rem] flex-col">
                        <span className="text-xs font-semibold text-muted-foreground">Grants</span>
                        <AbilityPicker keys={abilityKeys} value={term.grants} onChange={grants => drafts.edit(kind, tag, { grants })} />
                    </div>
                )}
            </div>
        </div>
    )
}

function sentence(ability: Ability, book: TermBook): string {
    return describeAbility(ability, { terms: book }).map(b => b.text).join(' · ')
}

interface LineEditorProps {
    abilityKey: string
    line: Ability
    raw: string
    parts: Part[]
    after?: (book: TermBook) => ReactNode
}

function LineEditor({ abilityKey, line, raw, parts, after }: LineEditorProps) {
    const { terms } = useInformation()
    const drafts = useTermDrafts()
    const [open, setOpen] = useState(false)
    const flagged = useFlagged(parts)
    const book = useMemo(() => withDrafts(terms, drafts.dirty), [terms, drafts.dirty])

    function cancel() {
        drafts.reset()
        setOpen(false)
    }

    async function save() {
        if (await drafts.saveAll()) setOpen(false)
    }

    function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.defaultPrevented) return
        if (event.key === 'Escape') { event.preventDefault(); cancel() }
    }

    return (
        <div className="py-2.5" onKeyDown={onKeyDown}>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => (open ? cancel() : setOpen(true))}
                className="group -mx-1 flex w-full items-baseline gap-2 rounded-sm px-1 py-0.5 text-left transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 motion-reduce:transition-none"
            >
                <ChevronRight aria-hidden className={cn('h-3.5 w-3.5 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none', open && 'rotate-90')} />
                <span className="min-w-0 flex-1 text-base text-foreground">{sentence(line, book)}</span>
                {flagged && <Dot label="Needs attention" />}
            </button>
            {open && (
                <div className="pl-5">
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{raw}</p>
                    {after?.(book)}
                    <div className="mt-1 divide-y divide-border/30">
                        {parts.map(part => <PartFields key={`${part.kind}-${part.tag}`} part={part} drafts={drafts} />)}
                    </div>
                    {drafts.errors.length > 0 && (
                        <ul role="alert" className="mt-2 space-y-0.5 text-sm text-destructive">
                            {drafts.errors.flatMap(e => e.messages.map(m => (
                                <li key={`${e.term.tag}-${m}`}><span className="font-mono">{e.term.tag}</span>: {m}</li>
                            )))}
                        </ul>
                    )}
                    <SaveControls
                        tags={drafts.dirty.map(d => d.tag).join(', ')}
                        dirty={drafts.dirty.length > 0}
                        blocked={drafts.errors.length > 0}
                        saving={drafts.saving}
                        changes={drafts.changes}
                        editing={abilityKey}
                        onSave={() => void save()}
                        onCancel={cancel}
                    />
                </div>
            )}
        </div>
    )
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
    return (
        <section className="mt-8">
            <h3 className="flex items-baseline gap-2 border-b border-border pb-2 text-sm font-semibold text-foreground">
                {title}
                <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">{count}</span>
            </h3>
            <div className="divide-y divide-border/40">{children}</div>
        </section>
    )
}

function GrantedLines({ grants, book }: { grants: string | null; book: TermBook }) {
    const { context, index } = useInformation()
    if (!grants) return null
    const granted = context.lookup?.(grants)
    return (
        <div className="mt-1 pl-5 text-sm">
            <span className="text-muted-foreground">Grants </span>
            {granted
                ? <Link href={abilityHref(granted.key, index.get(granted.key))} className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground">{granted.key}</Link>
                : <span className="text-foreground">{grants}</span>}
            {granted && (
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    {describeAbility(granted, { terms: book }).map((b, j) => <li key={j}>{b.text}</li>)}
                </ul>
            )}
        </div>
    )
}

export default function AbilityLines({ ability }: { ability: Ability }) {
    const params = Object.entries(ability.params)

    return (
        <>
            {ability.effects.length > 0 && (
                <Section title="Effects" count={ability.effects.length}>
                    {ability.effects.map((effect, i) => {
                        const options = Object.entries(effect.options ?? {}).filter(([key]) => !SKIPPED_OPTIONS.has(key))
                        return (
                            <LineEditor
                                key={`effect-${i}`}
                                abilityKey={ability.key}
                                line={{ key: ability.key, effects: [effect], params: {} }}
                                raw={[`${effect.op} · ${effect.tag} · ${fmt(effect.amount)}`, ...options.map(([k, v]) => `${k} ${show(v)}`)].join(' · ')}
                                parts={[
                                    { kind: 'effect', tag: effect.tag, value: effect.amount, op: effect.op },
                                    ...options.map(([key, value]) => ({ kind: 'option' as const, tag: key, value })),
                                ]}
                            />
                        )
                    })}
                </Section>
            )}

            {params.length > 0 && (
                <Section title="Params" count={params.length}>
                    {params.map(([tag, value]) => (
                        <LineEditor
                            key={`param-${tag}`}
                            abilityKey={ability.key}
                            line={{ key: ability.key, effects: [], params: { [tag]: value } }}
                            raw={`${tag} · ${show(value)}`}
                            parts={[{ kind: 'param', tag, value }]}
                            after={book => <GrantedLines grants={book.params.get(tag)?.grants ?? null} book={book} />}
                        />
                    ))}
                </Section>
            )}
        </>
    )
}
