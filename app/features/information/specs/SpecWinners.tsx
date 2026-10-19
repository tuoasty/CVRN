import Link from 'next/link'
import { cn } from '@/lib/utils'
import AvatarImage from '@/app/components/ui/AvatarImage'
import { buildPublicPlayerHref } from '@/app/utils/matchDetailHref'
import type { RecentSpecWinnerEntry } from '@/server/domains/spec'

const ROW = '-mx-2 flex min-w-0 items-center gap-3 px-2 py-1.5'

export interface WinnerColumn {
    code: string
    seasons: RecentSpecWinnerEntry[]
}

type Winner = NonNullable<RecentSpecWinnerEntry['winner']>

interface SeasonRow {
    slug: string
    name: string
    number: number
    endDate: string
    byRegion: Record<string, Winner>
}

function seasonNumber(slug: string): number {
    const match = slug.match(/(\d+)$/)
    return match ? Number(match[1]) : -1
}

function seasonRows(columns: WinnerColumn[]): SeasonRow[] {
    const rows = new Map<string, SeasonRow>()
    for (const column of columns) {
        for (const { season, winner } of column.seasons) {
            if (!winner) continue
            const row = rows.get(season.slug) ?? { slug: season.slug, name: season.name, number: seasonNumber(season.slug), endDate: season.endDate, byRegion: {} }
            row.byRegion[column.code] = winner
            if (season.endDate > row.endDate) row.endDate = season.endDate
            rows.set(season.slug, row)
        }
    }
    return [...rows.values()].sort((a, b) => b.number - a.number || b.endDate.localeCompare(a.endDate))
}

function Entry({ code, winner }: { code: string; winner: Winner }) {
    const { player } = winner
    const name = player.display_name || player.username
    const href = buildPublicPlayerHref(player.username)
    const body = (
        <>
            <span className="relative h-9 w-9 shrink-0 overflow-hidden">
                <AvatarImage src={player.avatar_url} alt={name} sizes="36px" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold leading-5 text-foreground">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">@{player.username}</span>
            </span>
            <span className="shrink-0 font-mono text-xs uppercase tabular-nums text-muted-foreground">{code}</span>
        </>
    )
    return (
        <li className="min-w-0">
            {href ? (
                <Link
                    href={href}
                    prefetch={false}
                    className={cn(
                        ROW,
                        'transition-colors duration-150 hover:bg-muted/30 motion-reduce:transition-none',
                        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50',
                    )}
                >
                    {body}
                </Link>
            ) : (
                <div className={ROW}>{body}</div>
            )}
        </li>
    )
}

export default function SpecWinners({ columns }: { columns: WinnerColumn[] }) {
    const rows = seasonRows(columns)
    if (rows.length === 0) return null

    return (
        <section aria-labelledby="winners-heading" className="mt-10">
            <h2 id="winners-heading" className="mb-3 text-sm font-semibold text-foreground">Winners</h2>
            {rows.map(row => (
                <div key={row.slug} className="grid items-center gap-x-6 gap-y-2.5 border-t border-border py-3.5 sm:grid-cols-[32px_minmax(0,1fr)]">
                    <span title={row.name} className="font-mono text-xs font-semibold uppercase tabular-nums text-muted-foreground">
                        {row.number >= 0 ? `S${row.number}` : row.slug}
                    </span>
                    <ul aria-label={`${row.name} winners`} className="grid gap-x-6 gap-y-1 sm:grid-cols-3">
                        {columns
                            .filter(column => row.byRegion[column.code])
                            .map(column => <Entry key={column.code} code={column.code} winner={row.byRegion[column.code]} />)}
                    </ul>
                </div>
            ))}
        </section>
    )
}
