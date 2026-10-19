"use client"

import { Fragment, useMemo, useState } from 'react'
import { InlineSwitch } from '@/app/components/filters/InlineSwitch'
import { cn } from '@/lib/utils'
import { termId } from '@/server/domains/gameData/terms/termUsage'
import { TERM_KINDS, type TermKind } from '@/server/domains/gameData/terms/types'
import { useInformation } from './InformationProvider'
import TermEditor from './TermEditor'
import TermContext from './TermContext'

type StatusFilter = 'all' | 'unverified'
type KindFilter = 'any' | TermKind

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
    { value: 'any', label: 'Any kind' },
    { value: 'effect', label: 'Effects' },
    { value: 'param', label: 'Params' },
    { value: 'option', label: 'Options' },
]

const GRID = 'grid grid-cols-[minmax(0,13rem)_minmax(0,12rem)_3rem_minmax(0,1fr)_3.5rem_6.5rem] items-baseline gap-x-4'

export default function TermsGlossary() {
    const { termList, usage, setVerified } = useInformation()
    const [status, setStatus] = useState<StatusFilter>('all')
    const [kind, setKind] = useState<KindFilter>('any')
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState<string | null>(null)

    const unverified = termList.filter(t => !t.verified).length
    const rows = useMemo(() => {
        const needle = query.trim().toLowerCase()
        return [...termList]
            .sort((a, b) => TERM_KINDS.indexOf(a.kind) - TERM_KINDS.indexOf(b.kind) || a.tag.localeCompare(b.tag))
            .filter(t => status === 'all' || !t.verified)
            .filter(t => kind === 'any' || t.kind === kind)
            .filter(t => !needle || [t.tag, t.label, t.template].some(v => v?.toLowerCase().includes(needle)))
    }, [termList, status, kind, query])

    return (
        <div className="mt-6">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <InlineSwitch<StatusFilter>
                    label="Status"
                    className="-ml-2"
                    options={[{ value: 'all', label: 'All' }, { value: 'unverified', label: `Unverified ${unverified}` }]}
                    value={status}
                    onChange={setStatus}
                />
                <InlineSwitch<KindFilter> label="Kind" options={KIND_OPTIONS} value={kind} onChange={setKind} />
                <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search tags or wording"
                    aria-label="Search tags or wording"
                    className="ml-auto w-64 border-b border-border bg-transparent py-1 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
            </div>

            <div role="table" aria-label="Terms" className="mt-4">
                <div role="row" className={cn(GRID, 'border-b border-border px-3 pb-2 text-xs font-semibold text-muted-foreground')}>
                    <span role="columnheader">Tag</span>
                    <span role="columnheader">Label</span>
                    <span role="columnheader">Unit</span>
                    <span role="columnheader">Label description</span>
                    <span role="columnheader" className="text-right">Used</span>
                    <span role="columnheader">Status</span>
                </div>
                {rows.length === 0 && <p className="px-3 py-6 text-sm text-muted-foreground">No terms match these filters.</p>}
                {rows.map(term => {
                    const id = termId(term.kind, term.tag)
                    const use = usage.get(id)
                    const isOpen = open === id
                    return (
                        <Fragment key={id}>
                            <div
                                role="row"
                                tabIndex={0}
                                aria-expanded={isOpen}
                                onClick={() => setOpen(isOpen ? null : id)}
                                onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpen(isOpen ? null : id) } }}
                                className={cn(
                                    GRID,
                                    'cursor-pointer px-3 py-2.5 text-sm transition-colors duration-150 motion-reduce:transition-none',
                                    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50',
                                    isOpen ? 'bg-muted/50' : 'hover:bg-muted/30',
                                )}
                            >
                                <span role="cell" className="truncate font-mono text-xs text-foreground">
                                    {term.tag}
                                    <span className="ml-2 font-sans text-muted-foreground">{term.kind}</span>
                                </span>
                                <span role="cell" className="truncate text-foreground">{term.label ?? <span className="text-muted-foreground">none</span>}</span>
                                <span role="cell" className="font-mono text-xs text-muted-foreground">{term.unit ?? ''}</span>
                                <span role="cell" className="min-w-0 text-foreground">{term.template ?? <span className="text-muted-foreground">generated from label</span>}</span>
                                <span role="cell" className="text-right font-mono tabular-nums text-muted-foreground">{use?.uses ?? 0}</span>
                                <span role="cell" className={term.verified ? 'text-muted-foreground' : 'font-medium text-secondary'}>
                                    {term.verified ? 'Verified' : 'Unverified'}
                                </span>
                            </div>
                            {isOpen && (
                                <div className="bg-muted/50 px-3 pb-5 pt-1 sm:pl-[calc(13rem+1rem)]">
                                    {use
                                        ? <TermEditor kind={term.kind} tag={term.tag} value={use.examples[0] ?? 1} op={use.op} />
                                        : <p className="text-sm text-muted-foreground">No stored ability uses this tag right now.</p>}
                                    <button
                                        type="button"
                                        onClick={() => void setVerified(term.kind, term.tag, !term.verified)}
                                        className="mt-2 text-xs text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground"
                                    >
                                        {term.verified ? 'Mark unverified' : 'Mark verified'}
                                    </button>
                                    {use && <TermContext kind={term.kind} tag={term.tag} abilityKeys={use.abilities} />}
                                </div>
                            )}
                        </Fragment>
                    )
                })}
            </div>
        </div>
    )
}
