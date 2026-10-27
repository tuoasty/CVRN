"use client"

import Image from 'next/image'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { DefaultTeamLogo } from '@/app/components/ui/DefaultTeamLogo'
import { getLogoClassName } from '@/app/lib/logoClass'
import { cn } from '@/lib/utils'
import { CATEGORY_COLUMNS, OverallDisplayRow, OverallSortKey } from './overallRows'

type Props = {
    ranked: { row: OverallDisplayRow; rank: number }[]
    sort: OverallSortKey
    desc: boolean
    onSort: (key: OverallSortKey) => void
}

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
        <th aria-sort={active ? (desc ? 'descending' : 'ascending') : 'none'} className={cn('text-right', className)}>
            <button
                type="button"
                title={title}
                onClick={() => onSort(sortKey)}
                className={cn(
                    'inline-flex items-center gap-0.5 rounded-sm uppercase tracking-wider focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    active ? 'text-foreground underline decoration-2 underline-offset-[6px]' : 'hover:text-foreground',
                )}
            >
                {label}
                {active && (desc ? <ArrowDown className="h-3 w-3" aria-hidden /> : <ArrowUp className="h-3 w-3" aria-hidden />)}
            </button>
        </th>
    )
}

export default function OverallBoardTable({ ranked, sort, desc, onSort }: Props) {
    const headerProps = { sort, desc, onSort }
    return (
        <div className="panel overflow-x-auto">
            <table className="table-dense">
                <thead>
                    <tr>
                        <th className="w-12 text-right">#</th>
                        <th>Player</th>
                        <th>Team</th>
                        <th className="w-14">Pos</th>
                        <SortHeader label="Sets" title="Sets played (all regions, this season number)" sortKey="sets" {...headerProps} className="w-16" />
                        <SortHeader label="OVR" title="Overall" sortKey="ovr" {...headerProps} className="w-16" />
                        {CATEGORY_COLUMNS.map(col => (
                            <SortHeader key={col.key} label={col.label} title={col.title} sortKey={col.key} {...headerProps} className="w-14" />
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {ranked.map(({ row, rank }) => (
                        <OverallRow key={row.playerId} row={row} rank={rank} sort={sort} />
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function OverallRow({ row, rank, sort }: { row: OverallDisplayRow; rank: number; sort: OverallSortKey }) {
    const hasDistinctDisplayName = !!row.displayName && row.displayName !== row.username
    return (
        <tr>
            <td className="text-right font-mono tabular-nums text-muted-foreground">{rank}</td>
            <td>
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative w-9 h-9 shrink-0 rounded-full overflow-hidden bg-muted">
                        {row.avatarUrl && <Image src={row.avatarUrl} alt="" fill sizes="36px" className="object-cover" unoptimized />}
                    </div>
                    <div className="min-w-0 leading-tight">
                        <span className="block truncate font-medium">{hasDistinctDisplayName ? row.displayName : row.username}</span>
                        {hasDistinctDisplayName && <span className="block truncate text-xs text-muted-foreground">{row.username}</span>}
                    </div>
                </div>
            </td>
            <td>
                {row.teamName ? (
                    <div className="flex items-center gap-2 min-w-0 text-muted-foreground">
                        <div className="relative w-7 h-7 shrink-0">
                            {row.teamLogoUrl
                                ? <Image src={row.teamLogoUrl} alt="" fill sizes="28px" className={getLogoClassName(false)} unoptimized />
                                : <DefaultTeamLogo sizes="28px" />}
                        </div>
                        <span className="truncate">{row.teamName}</span>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">Unrostered</span>
                )}
            </td>
            <td className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{row.position ?? '?'}</td>
            <td className={cn('text-right font-mono tabular-nums', sort === 'sets' ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                {row.setsPlayed}
            </td>
            <td className="text-right font-mono tabular-nums text-base font-semibold text-foreground">{row.ovr}</td>
            {CATEGORY_COLUMNS.map(col => (
                <td
                    key={col.key}
                    className={cn('text-right font-mono tabular-nums', sort === col.key ? 'font-semibold text-foreground' : 'text-foreground/70')}
                >
                    {row.attributes[col.key]}
                </td>
            ))}
        </tr>
    )
}
