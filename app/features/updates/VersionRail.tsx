import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UpdateLogIndexEntry } from '@/server/domains/updateLog'
import { formatReleased } from './formatReleased'
import { versionWindow } from './versionWindow'

export function versionHref(version: string): string {
    return `/information/updates/${encodeURIComponent(version)}`
}

function RailArrow({ entry, direction, hidden }: { entry: UpdateLogIndexEntry | null; direction: 'newer' | 'older'; hidden: number }) {
    const Icon = direction === 'newer' ? ChevronUp : ChevronDown
    const label = direction === 'newer' ? 'Newer' : 'Older'
    const content = (
        <>
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {hidden > 0 && <span className="font-mono tabular-nums font-normal normal-case tracking-normal">+{hidden}</span>}
        </>
    )
    const className = 'flex items-center gap-1.5 py-1.5 text-xs font-semibold uppercase tracking-wider'

    if (!entry) {
        return <span aria-disabled className={cn(className, 'text-muted-foreground/40')}>{content}</span>
    }
    return (
        <Link
            href={versionHref(entry.version)}
            aria-label={`${label} version ${entry.version}`}
            className={cn(className, 'text-muted-foreground transition-colors hover:text-foreground')}
        >
            {content}
        </Link>
    )
}

interface Props {
    index: UpdateLogIndexEntry[]
    current: string
    newer: UpdateLogIndexEntry | null
    older: UpdateLogIndexEntry | null
}

export default function VersionRail({ index, current, newer, older }: Props) {
    const currentIndex = index.findIndex(e => e.version === current)
    const { start, end } = versionWindow(index.length, currentIndex)
    const shown = index.slice(start, end)

    return (
        <nav aria-label="Versions">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Versions</p>
            <div className="mt-2">
                <RailArrow entry={newer} direction="newer" hidden={start} />
                <ol className="my-1 border-l border-border">
                    {shown.map(entry => {
                        const isCurrent = entry.version === current
                        return (
                            <li key={entry.version}>
                                <Link
                                    href={versionHref(entry.version)}
                                    aria-current={isCurrent ? 'page' : undefined}
                                    className="group relative block py-1.5 pl-4 pr-2"
                                >
                                    <span
                                        aria-hidden
                                        className={cn(
                                            'absolute -left-[4.5px] top-[0.8rem] h-2 w-2 rounded-full border',
                                            isCurrent
                                                ? 'border-foreground bg-foreground'
                                                : 'border-muted-foreground/60 bg-background group-hover:border-foreground',
                                        )}
                                    />
                                    <span className="flex items-baseline justify-between gap-2">
                                        <span className={cn(
                                            'truncate font-mono text-sm transition-colors',
                                            isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground group-hover:text-foreground',
                                        )}>
                                            {entry.version}
                                        </span>
                                        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                                            {formatReleased(entry.released_at)}
                                        </span>
                                    </span>
                                    {entry.title && (
                                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{entry.title}</span>
                                    )}
                                </Link>
                            </li>
                        )
                    })}
                </ol>
                <RailArrow entry={older} direction="older" hidden={index.length - end} />
            </div>
        </nav>
    )
}
