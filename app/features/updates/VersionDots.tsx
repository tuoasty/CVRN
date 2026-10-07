import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UpdateLogIndexEntry } from '@/server/domains/updateLog'
import { formatReleased } from './formatReleased'
import { versionHref } from './VersionRail'
import { versionWindow } from './versionWindow'

function DotArrow({ entry, direction, hidden }: { entry: UpdateLogIndexEntry | null; direction: 'newer' | 'older'; hidden: number }) {
    const newer = direction === 'newer'
    const label = newer ? 'Newer' : 'Older'
    const count = hidden > 0 && <span className="font-mono tabular-nums font-normal normal-case tracking-normal">+{hidden}</span>
    const content = newer
        ? <><ChevronLeft className="h-4 w-4" /><span>{label}</span>{count}</>
        : <>{count}<span>{label}</span><ChevronRight className="h-4 w-4" /></>
    const className = 'flex shrink-0 items-center gap-1.5 py-1 text-xs font-semibold uppercase tracking-wider'

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
    className?: string
}

export default function VersionDots({ index, current, newer, older, className }: Props) {
    const currentIndex = index.findIndex(e => e.version === current)
    const { start, end } = versionWindow(index.length, currentIndex)
    const shown = index.slice(start, end)

    return (
        <nav aria-label="Versions" className={cn('flex items-center justify-between gap-3', className)}>
            <DotArrow entry={newer} direction="newer" hidden={start} />
            <ol className="relative flex items-center before:absolute before:inset-x-3 before:top-1/2 before:h-px before:bg-border">
                {shown.map(entry => {
                    const isCurrent = entry.version === current
                    return (
                        <li key={entry.version} className="relative">
                            <Link
                                href={versionHref(entry.version)}
                                aria-label={`Version ${entry.version}`}
                                aria-current={isCurrent ? 'page' : undefined}
                                title={`${entry.version} · ${formatReleased(entry.released_at)}`}
                                className="group flex h-6 w-6 items-center justify-center"
                            >
                                <span
                                    aria-hidden
                                    className={cn(
                                        'h-2 w-2 rounded-full border',
                                        isCurrent
                                            ? 'border-foreground bg-foreground'
                                            : 'border-muted-foreground/60 bg-background group-hover:border-foreground',
                                    )}
                                />
                            </Link>
                        </li>
                    )
                })}
            </ol>
            <DotArrow entry={older} direction="older" hidden={index.length - end} />
        </nav>
    )
}
