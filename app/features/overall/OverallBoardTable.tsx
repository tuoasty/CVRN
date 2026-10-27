"use client"

import { useState } from 'react'
import Image from 'next/image'
import { ArrowDown, ArrowUp, PenLine, RotateCcw } from 'lucide-react'
import { DefaultTeamLogo } from '@/app/components/ui/DefaultTeamLogo'
import { getLogoClassName } from '@/app/lib/logoClass'
import { cn } from '@/lib/utils'
import { CATEGORY_COLUMNS, OverallDisplayRow, OverallSortKey } from './overallRows'

type OverrideHandlers = {
    onOverride: (row: OverallDisplayRow, overall: number) => void
    onClearOverride: (row: OverallDisplayRow) => void
}

type Props = OverrideHandlers & {
    ranked: { row: OverallDisplayRow; rank: number }[]
    sort: OverallSortKey
    desc: boolean
    showPosition: boolean
    onSort: (key: OverallSortKey) => void
}

const TH = 'h-8 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border whitespace-nowrap'
const TD = 'h-9 px-2 whitespace-nowrap'
const FOCUS = 'rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

function SortHeader({ label, title, sortKey, sort, desc, onSort, className }: {
    label: string
    title: string
    sortKey: OverallSortKey
    sort: OverallSortKey
    desc: boolean
    onSort: (key: OverallSortKey) => void
    className?: string
}) {
    const active = sort === sortKey
    return (
        <th
            aria-sort={active ? (desc ? 'descending' : 'ascending') : 'none'}
            className={cn(TH, 'text-right', active && 'text-foreground shadow-[inset_0_-2px_0_currentColor]', className)}
        >
            <button
                type="button"
                title={title}
                onClick={() => onSort(sortKey)}
                className={cn('inline-flex items-center gap-0.5 uppercase tracking-wider hover:text-foreground', FOCUS)}
            >
                {label}
                {active && (desc ? <ArrowDown className="h-3 w-3" aria-hidden /> : <ArrowUp className="h-3 w-3" aria-hidden />)}
            </button>
        </th>
    )
}

export default function OverallBoardTable({ ranked, sort, desc, showPosition, onSort, onOverride, onClearOverride }: Props) {
    const headerProps = { sort, desc, onSort }
    return (
        <div className="min-w-0 flex-1 overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className={cn(TH, 'w-10 text-right')}>#</th>
                        <th className={cn(TH, 'text-left')}>Player</th>
                        <th className={cn(TH, 'text-left')}>Team</th>
                        {showPosition && <th className={cn(TH, 'w-12 text-left')}>Pos</th>}
                        <SortHeader label="OVR" title="Overall. Click a value to override it." sortKey="ovr" {...headerProps} className="w-28" />
                        {CATEGORY_COLUMNS.map(col => (
                            <SortHeader key={col.key} label={col.label} title={col.title} sortKey={col.key} {...headerProps} className="w-14" />
                        ))}
                        <SortHeader label="Sets" title="Sets played (all regions, this season number)" sortKey="sets" {...headerProps} className="w-14" />
                    </tr>
                </thead>
                <tbody>
                    {ranked.map(({ row, rank }) => (
                        <OverallRow
                            key={row.playerId}
                            row={row}
                            rank={rank}
                            sort={sort}
                            showPosition={showPosition}
                            onOverride={onOverride}
                            onClearOverride={onClearOverride}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function OvrCell({ row, onOverride, onClearOverride }: OverrideHandlers & { row: OverallDisplayRow }) {
    const [editing, setEditing] = useState(false)
    const [text, setText] = useState('')
    const overridden = row.overrideOvr !== null

    const startEdit = () => {
        setText(String(row.ovr))
        setEditing(true)
    }

    const commit = () => {
        const n = Number(text)
        setEditing(false)
        if (!Number.isInteger(n) || n < 1 || n > 99 || n === row.ovr) return
        onOverride(row, n)
    }

    if (editing) {
        return (
            <input
                autoFocus
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                step={1}
                value={text}
                aria-label={`Override overall for ${row.username}`}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') commit()
                    if (e.key === 'Escape') setEditing(false)
                }}
                onBlur={() => setEditing(false)}
                className="h-7 w-14 rounded-sm border border-primary bg-transparent px-1.5 text-right font-mono text-lg font-semibold tabular-nums ring-2 ring-primary/40 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
        )
    }

    return (
        <div className="inline-flex items-center justify-end gap-1.5">
            {overridden && (
                <>
                    <button
                        type="button"
                        title="Revert to computed"
                        aria-label={`Revert ${row.username} to computed overall`}
                        onClick={() => onClearOverride(row)}
                        className={cn('text-muted-foreground opacity-0 transition-opacity duration-150 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100', FOCUS)}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground" title={`Computed ${row.computedOvr}`}>
                        {row.computedOvr}
                    </span>
                </>
            )}
            <button
                type="button"
                title={overridden ? `Overridden (computed ${row.computedOvr}). Click to edit.` : 'Click to override'}
                onClick={startEdit}
                className={cn('-mx-1 inline-flex items-center gap-1 px-1 hover:bg-foreground/[0.06]', FOCUS)}
            >
                {overridden && <PenLine className="h-3 w-3 text-foreground" aria-label="Overridden" />}
                <span className="font-mono text-lg font-semibold tabular-nums text-foreground">{row.ovr}</span>
            </button>
        </div>
    )
}

function OverallRow({ row, rank, sort, showPosition, onOverride, onClearOverride }: OverrideHandlers & {
    row: OverallDisplayRow
    rank: number
    sort: OverallSortKey
    showPosition: boolean
}) {
    const name = row.displayName || row.username
    return (
        <tr className="group border-b border-border/60 transition-colors duration-150 hover:bg-foreground/[0.03]">
            <td className={cn(TD, 'text-right font-mono text-sm tabular-nums text-muted-foreground')}>{rank}</td>
            <td className={TD}>
                <div className="flex min-w-0 items-center gap-2">
                    <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
                        {row.avatarUrl && <Image src={row.avatarUrl} alt="" fill sizes="24px" className="object-cover" unoptimized />}
                    </div>
                    <span className="truncate text-sm font-medium" title={name !== row.username ? row.username : undefined}>{name}</span>
                </div>
            </td>
            <td className={TD}>
                {row.teamName ? (
                    <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                        <div className="relative h-4 w-4 shrink-0">
                            {row.teamLogoUrl
                                ? <Image src={row.teamLogoUrl} alt="" fill sizes="16px" className={getLogoClassName(false)} unoptimized />
                                : <DefaultTeamLogo sizes="16px" />}
                        </div>
                        <span className="truncate">{row.teamName}</span>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">Unrostered</span>
                )}
            </td>
            {showPosition && (
                <td className={cn(TD, 'text-xs font-semibold uppercase tracking-wider text-muted-foreground')}>{row.position ?? '?'}</td>
            )}
            <td className={cn(TD, 'text-right')}>
                <OvrCell row={row} onOverride={onOverride} onClearOverride={onClearOverride} />
            </td>
            {CATEGORY_COLUMNS.map(col => (
                <td
                    key={col.key}
                    className={cn(TD, 'text-right font-mono text-sm tabular-nums', sort === col.key ? 'font-semibold text-foreground' : 'text-foreground/70')}
                >
                    {row.attributes[col.key]}
                </td>
            ))}
            <td className={cn(TD, 'text-right font-mono text-sm tabular-nums', sort === 'sets' ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {row.setsPlayed}
            </td>
        </tr>
    )
}
