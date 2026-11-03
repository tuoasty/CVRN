'use client'

import { useState } from 'react'
import { useCardCatalog } from '@/app/hooks/usePlayerCard'
import { stopCardBulk, useCardBulkStatus } from '@/app/hooks/useCardBulk'
import { toast } from '@/app/utils/toast'
import type { CardBulkJob, CardBulkJobStatus } from '@/server/domains/playerCard'
import { LINK } from './cardFormStyles'

const MODE_LABEL: Record<CardBulkJob['mode'], string> = {
    missing: 'Generate missing',
    all: 'Redo all',
}

const RESULT_LABEL: Record<Exclude<CardBulkJobStatus, 'running'>, string> = {
    completed: 'Completed',
    stopped: 'Stopped',
    interrupted: 'Interrupted',
}

function Count({ job }: { job: CardBulkJob }) {
    return <span className="font-mono text-sm tabular-nums text-foreground">{job.done}/{job.total}</span>
}

function RunningStrip({ job }: { job: CardBulkJob }) {
    const [stopping, setStopping] = useState(false)
    const percent = job.total > 0 ? (job.done / job.total) * 100 : 0

    async function handleStop() {
        setStopping(true)
        try {
            const result = await stopCardBulk(job.id)
            if (!result.ok) toast.error('Could not stop the run', result.error.message)
        } finally {
            setStopping(false)
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <div
                role="progressbar"
                aria-label="Bulk generation progress"
                aria-valuenow={job.done}
                aria-valuemin={0}
                aria-valuemax={job.total}
                className="h-1 w-full bg-muted"
            >
                <div className="h-full bg-foreground transition-[width] duration-200" style={{ width: `${percent}%` }} />
            </div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Count job={job} />
                {job.currentUsername && <span className="text-xs text-muted-foreground">{job.currentUsername}</span>}
                {job.failed > 0 && (
                    <span className="text-xs text-destructive">
                        <span className="font-mono tabular-nums">{job.failed}</span> failed
                    </span>
                )}
                {job.stopRequested ? (
                    <span className="text-xs text-foreground">Stopping after this card...</span>
                ) : (
                    <button type="button" className={LINK} disabled={stopping} onClick={handleStop}>Stop</button>
                )}
            </div>
        </div>
    )
}

function FinishedStrip({ job, status }: { job: CardBulkJob; status: Exclude<CardBulkJobStatus, 'running'> }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-foreground">{RESULT_LABEL[status]}</span>
                <Count job={job} />
                {job.stopReason && <span className="text-xs text-muted-foreground">{job.stopReason}</span>}
                {status === 'interrupted' && (
                    <span className="text-xs text-muted-foreground">The server restarted during this run. Start it again to continue.</span>
                )}
            </div>
            {job.failures.length > 0 && (
                <ul className="flex max-h-40 flex-col gap-0.5 overflow-y-auto text-xs">
                    {job.failures.map(failure => (
                        <li key={failure.playerId}>
                            <span className="text-foreground">{failure.username}</span>
                            <span className="text-destructive">: {failure.message}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default function CardBulkStatus() {
    const { job } = useCardBulkStatus()
    const { groups } = useCardCatalog()
    if (!job) return null

    const groupName = groups.find(group => group.id === job.groupId)?.name

    return (
        <section aria-label="Bulk generation" aria-live="polite" className="mt-4 flex flex-col gap-2 border-y border-border py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {job.regionCode} <span className="font-mono tabular-nums">S{job.seasonNumber}</span>{groupName ? ` ${groupName}` : ''} · {MODE_LABEL[job.mode]}
            </span>
            {job.status === 'running' ? <RunningStrip job={job} /> : <FinishedStrip job={job} status={job.status} />}
        </section>
    )
}
