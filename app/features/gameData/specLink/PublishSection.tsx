"use client"

import { Fragment, type ReactNode } from 'react'
import { CircleX } from 'lucide-react'
import { Button } from '@/app/components/ui/button'
import { formatHeight } from '@/shared/utils/height'
import type { HeightChange } from '@/server/domains/gameData/types/specLinks'
import { publishBlockerText, type PublishBlocker, type SpecWriteSummary } from '@/server/domains/gameData/helpers/specLoadouts/importFlow'

export interface PublishDone {
    at: string
    datasets: string[]
    summary: SpecWriteSummary | null
    heights: number
}

interface PublishSectionProps {
    datasets: { label: string; diff: string }[]
    summary: SpecWriteSummary | null
    heightChanges: HeightChange[]
    errors: string[]
    blocker: PublishBlocker | null
    undecided: number
    busy: boolean
    done: PublishDone | null
    onPublish: () => void
}

const N = ({ n }: { n: number }) => <span className="font-mono tabular-nums">{n}</span>

function joinParts(parts: ReactNode[]): ReactNode {
    return parts.map((p, i) => <Fragment key={i}>{i > 0 && ', '}{p}</Fragment>)
}

function specParts(s: SpecWriteSummary): ReactNode[] {
    const parts: ReactNode[] = []
    if (s.links > 0) {
        parts.push(
            <><N n={s.links} /> links{s.picked > 0 && <span className="text-muted-foreground"> (<N n={s.proposed} /> proposed, <N n={s.picked} /> picked)</span>}</>,
        )
    }
    if (s.created > 0) parts.push(<><N n={s.created} /> new</>)
    if (s.custom > 0) parts.push(<><N n={s.custom} /> custom</>)
    if (s.unlinked > 0) parts.push(<><N n={s.unlinked} /> unlinked</>)
    if (s.skipped > 0) parts.push(<><N n={s.skipped} /> skipped</>)
    if (s.left > 0) parts.push(<><N n={s.left} /> left unlinked</>)
    if (s.renamed > 0) parts.push(<><N n={s.renamed} /> renamed</>)
    return parts
}

function Key({ children }: { children: ReactNode }) {
    return <dt className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">{children}</dt>
}

export default function PublishSection({ datasets, summary, heightChanges, errors, blocker, undecided, busy, done, onPublish }: PublishSectionProps) {
    return (
        <section>
            <h3 className="border-b border-border pb-2 text-sm font-semibold text-foreground">Publish</h3>
            {done ? <DoneLine done={done} /> : (
                <>
                    <Summary datasets={datasets} summary={summary} heightChanges={heightChanges} />
                    {errors.length > 0 && (
                        <ul role="alert" className="mt-3.5 space-y-1">
                            {errors.map(e => (
                                <li key={e} className="flex items-start gap-2 text-sm text-destructive">
                                    <CircleX aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                                    {e}
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="mt-5 flex items-center gap-4">
                        <Button className="rounded-sm" disabled={busy || blocker !== null} onClick={onPublish}>
                            {busy ? 'Publishing…' : 'Publish'}
                        </Button>
                        {blocker && <span className="text-sm text-muted-foreground">{publishBlockerText(blocker, undecided)}</span>}
                    </div>
                </>
            )}
        </section>
    )
}

function Summary({ datasets, summary, heightChanges }: Pick<PublishSectionProps, 'datasets' | 'summary' | 'heightChanges'>) {
    const specs = summary ? specParts(summary) : []
    if (datasets.length === 0 && specs.length === 0 && heightChanges.length === 0) return null
    return (
        <dl className="mt-3.5 grid grid-cols-[150px_1fr] items-baseline gap-x-5 gap-y-2 text-sm">
            {datasets.length > 0 && (
                <>
                    <Key>Datasets</Key>
                    <dd>{joinParts(datasets.map(d => <>{d.label} <span className="font-mono text-xs tabular-nums text-muted-foreground">{d.diff}</span></>))}</dd>
                </>
            )}
            {specs.length > 0 && (
                <>
                    <Key>Specs</Key>
                    <dd>{joinParts(specs)}</dd>
                </>
            )}
            {heightChanges.length > 0 && (
                <>
                    <Key>Heights</Key>
                    <dd>
                        <ul className="grid grid-cols-[repeat(3,minmax(0,230px))] gap-x-5 gap-y-0.5">
                            {heightChanges.map(c => (
                                <li key={c.specId}>
                                    {c.name}{' '}
                                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatHeight(c.from)} →</span>{' '}
                                    <span className="font-mono text-xs tabular-nums">{formatHeight(c.to)}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-1.5 text-xs text-muted-foreground">Public page updates on the next snapshot publish.</p>
                    </dd>
                </>
            )}
        </dl>
    )
}

function DoneLine({ done }: { done: PublishDone }) {
    const parts: ReactNode[] = [
        ...done.datasets,
        ...(done.summary ? specParts(done.summary) : []),
        ...(done.heights > 0 ? [<><N n={done.heights} /> heights</>] : []),
    ]
    return (
        <div className="mt-3.5 text-sm">
            <p className="flex items-baseline gap-2.5">
                <span aria-hidden className="text-success">✓</span>
                <span>
                    Published <span className="font-mono tabular-nums">{done.at}</span>
                    {parts.length > 0 && <>: {joinParts(parts)}</>}
                </span>
            </p>
        </div>
    )
}
