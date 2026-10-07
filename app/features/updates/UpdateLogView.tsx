import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { neighborsOf } from '@/server/domains/updateLog/helpers/neighborsOf'
import type { UpdateLogIndexEntry, UpdateLogPublic } from '@/server/domains/updateLog'
import ChangelogBody from './changelog/ChangelogBody'
import VersionSwitcher from './VersionSwitcher'
import { formatReleased } from './formatReleased'

function PagerLink({ entry, direction }: { entry: UpdateLogIndexEntry; direction: 'older' | 'newer' }) {
    const newer = direction === 'newer'
    return (
        <Link
            href={`/updates/${encodeURIComponent(entry.version)}`}
            className={`group flex min-w-0 flex-col gap-1 p-4 transition-colors hover:bg-muted/40 ${newer ? 'items-end text-right' : ''}`}
        >
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {!newer && <ArrowLeft className="h-3.5 w-3.5" />}
                {newer ? 'Newer' : 'Older'}
                {newer && <ArrowRight className="h-3.5 w-3.5" />}
            </span>
            <span className="max-w-full truncate text-sm font-medium text-foreground group-hover:text-primary">
                <span className="font-mono">{entry.version}</span>
                {entry.title && <span className="text-muted-foreground"> · {entry.title}</span>}
            </span>
        </Link>
    )
}

export default function UpdateLogView({ log, index }: { log: UpdateLogPublic; index: UpdateLogIndexEntry[] }) {
    const { newer, older } = neighborsOf(index, log.version)

    return (
        <div className="mx-auto max-w-[1400px] px-7 pb-20 pt-6">
            <div className="mx-auto max-w-3xl">
                <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Update · <span className="font-mono tabular-nums normal-case tracking-normal">{formatReleased(log.released_at)}</span>
                        </p>
                        <h1 className="mt-1.5 text-2xl font-semibold tracking-[-.025em]">
                            <span className="font-mono">{log.version}</span>
                            {log.title && <span className="text-muted-foreground"> {log.title}</span>}
                        </h1>
                    </div>
                    {index.length > 1 && <VersionSwitcher versions={index} current={log.version} />}
                </header>

                <article className="pt-6">
                    <ChangelogBody body={log.body} />
                </article>

                {(older || newer) && (
                    <nav aria-label="Other versions" className="panel mt-12 grid grid-cols-2 divide-x divide-border">
                        {older ? <PagerLink entry={older} direction="older" /> : <span />}
                        {newer ? <PagerLink entry={newer} direction="newer" /> : <span />}
                    </nav>
                )}
            </div>
        </div>
    )
}
