import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { neighborsOf } from '@/server/domains/updateLog/helpers/neighborsOf'
import type { UpdateLogIndexEntry, UpdateLogPublic } from '@/server/domains/updateLog'
import ChangelogBody from './changelog/ChangelogBody'
import { extractToc } from './changelog/extractToc'
import { OVERVIEW_ID } from './changelog/tocNavigation'
import ChangelogLayout from './ChangelogLayout'
import VersionRail from './VersionRail'
import VersionDots from './VersionDots'
import { formatReleased } from './formatReleased'

function PagerLink({ entry, direction }: { entry: UpdateLogIndexEntry; direction: 'older' | 'newer' }) {
    const newer = direction === 'newer'
    return (
        <Link
            href={`/information/updates/${encodeURIComponent(entry.version)}`}
            className={`group flex min-w-0 max-w-[48%] flex-col gap-1 ${newer ? '' : 'ml-auto items-end text-right'}`}
        >
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground">
                {newer && <ArrowLeft className="h-3.5 w-3.5" />}
                {newer ? 'Newer' : 'Older'}
                {!newer && <ArrowRight className="h-3.5 w-3.5" />}
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
    const toc = extractToc(log.body)

    const header = (
        <header className="border-b border-border pb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Update · <span className="font-mono tabular-nums normal-case tracking-normal">{formatReleased(log.released_at)}</span>
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-[-.025em]">
                <span className="font-mono">{log.version}</span>
                {log.title && <span className="text-muted-foreground"> {log.title}</span>}
            </h1>
            {index.length > 1 && (
                <VersionDots index={index} current={log.version} newer={newer} older={older} className="mt-4 xl:hidden" />
            )}
        </header>
    )

    const footer = (older || newer) ? (
        <nav aria-label="Other versions" className="mt-12 flex items-start gap-6 border-t border-border pt-6">
            {newer && <PagerLink entry={newer} direction="newer" />}
            {older && <PagerLink entry={older} direction="older" />}
        </nav>
    ) : null

    return (
        <div className="mx-auto max-w-[1400px] px-7 pb-20 pt-6">
            <ChangelogLayout
                key={log.version}
                toc={toc}
                version={log.version}
                title={log.title}
                header={header}
                footer={footer}
                rail={index.length > 1 ? <VersionRail index={index} current={log.version} newer={newer} older={older} /> : null}
            >
                <article id={toc.overview ? OVERVIEW_ID : undefined} className="scroll-mt-24 pt-6">
                    <ChangelogBody body={log.body} images={log.images ?? []} />
                </article>
            </ChangelogLayout>
        </div>
    )
}
