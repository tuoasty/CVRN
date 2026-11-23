"use client"

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { fmt } from '@/server/domains/gameData/terms/format'
import { SERVE_STYLE_SOURCE, termId } from '@/server/domains/gameData/terms/termUsage'
import { useInformation } from './InformationProvider'
import TermEditor from './TermEditor'
import { abilityHref } from './abilityLinks'

const GRID = 'grid grid-cols-[minmax(0,13rem)_3.5rem_minmax(0,10rem)_minmax(0,1fr)_6rem] items-baseline gap-x-4'
const SHOWN_ABILITIES = 4

export default function UnhandledTerms() {
    const { unhandled, index } = useInformation()
    const [open, setOpen] = useState<string | null>(null)

    if (unhandled.length === 0) {
        return <p className="py-16 text-sm text-muted-foreground">Every tag in the game data has wording.</p>
    }

    return (
        <div role="table" aria-label="Tags without wording" className="mt-6">
            <div role="row" className={cn(GRID, 'border-b border-border px-3 pb-2 text-xs font-semibold text-muted-foreground')}>
                <span role="columnheader">Tag</span>
                <span role="columnheader" className="text-right">Used</span>
                <span role="columnheader">Example values</span>
                <span role="columnheader">Abilities</span>
                <span role="columnheader" />
            </div>
            {unhandled.map(u => {
                const id = termId(u.kind, u.tag)
                const isOpen = open === id
                return (
                    <Fragment key={id}>
                        <div role="row" className={cn(GRID, 'px-3 py-2.5 text-sm', isOpen && 'bg-muted/50')}>
                            <span role="cell" className="truncate font-mono text-xs text-foreground">
                                {u.tag}
                                <span className="ml-2 font-sans text-muted-foreground">{u.kind}</span>
                            </span>
                            <span role="cell" className="text-right font-mono tabular-nums text-muted-foreground">{u.uses}</span>
                            <span role="cell" className="truncate font-mono text-xs text-muted-foreground">
                                {u.examples.map(v => (typeof v === 'number' ? fmt(v) : String(v))).join(', ')}
                            </span>
                            <span role="cell" className="min-w-0 text-muted-foreground">
                                {u.abilities.slice(0, SHOWN_ABILITIES).map((key, i) => (
                                    <Fragment key={key}>
                                        {i > 0 && ', '}
                                        {key === SERVE_STYLE_SOURCE
                                            ? key
                                            : <Link href={abilityHref(key, index.get(key))} className="underline decoration-border underline-offset-4 hover:text-foreground">{key}</Link>}
                                    </Fragment>
                                ))}
                                {u.abilities.length > SHOWN_ABILITIES && ` and ${u.abilities.length - SHOWN_ABILITIES} more`}
                            </span>
                            <span role="cell" className="text-right">
                                <button
                                    type="button"
                                    onClick={() => setOpen(isOpen ? null : id)}
                                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    {isOpen ? 'Close' : 'Add term'}
                                </button>
                            </span>
                        </div>
                        {isOpen && (
                            <div className="bg-muted/50 px-3 pb-5 pt-1 sm:pl-[calc(13rem+1.75rem)]">
                                <TermEditor kind={u.kind} tag={u.tag} value={u.examples[0] ?? 1} op={u.op} startOpen onDone={() => setOpen(null)} />
                            </div>
                        )}
                    </Fragment>
                )
            })}
        </div>
    )
}
