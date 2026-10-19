import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { InspectorData, TunedInspector } from '@/server/domains/gameData'
import { rarityTextClass } from '../rarity'

const KIND_LABEL = { physical: 'Physical', technical: 'Technical' } as const

export default function InspectorContent({ data, title }: { data: InspectorData | TunedInspector; title?: string }) {
    const tuned = 'tuned' in data ? data.tuned : undefined

    return (
        <div>
            <p className="text-lg font-semibold leading-snug tracking-[-0.01em] text-foreground">{title ?? data.name}</p>
            <p className="mt-0.5 text-xs">
                {data.kind === 'exclusive' ? (
                    <span className="text-muted-foreground">Exclusive</span>
                ) : (
                    <>
                        {data.rarity && <span className={cn('font-semibold', rarityTextClass(data.rarity))}>{data.rarity}</span>}
                        <span className="text-muted-foreground">{data.rarity ? ' · ' : ''}{KIND_LABEL[data.kind]}</span>
                    </>
                )}
            </p>

            {data.sheet && (
                <dl className="mt-3 space-y-1">
                    {data.sheet.map((row, i) => (
                        <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4">
                            <dt className="text-sm text-muted-foreground">{row.label}</dt>
                            <dd className="font-mono text-xs tabular-nums text-foreground">
                                {row.was && <s className="mr-2 text-muted-foreground">{row.was}</s>}
                                {row.value}
                            </dd>
                        </div>
                    ))}
                </dl>
            )}
            {!data.sheet && data.text && <p className="mt-3 text-sm leading-[21px] text-foreground">{data.text}</p>}
            {!data.sheet && !data.text && data.lines && (
                <ul className="mt-3 space-y-1">
                    {data.lines.map((line, i) => (
                        <li key={i} className="text-sm leading-[21px] text-foreground">{line}</li>
                    ))}
                </ul>
            )}

            {tuned && tuned.length > 0 && (
                <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">Tuned on this spec</p>
                    <ul className="mt-1.5 space-y-1">
                        {tuned.map((line, i) => (
                            <li key={i} className="text-sm text-foreground">{line}</li>
                        ))}
                    </ul>
                </div>
            )}

            {data.href && (
                <Link href={data.href} className="mt-4 inline-block text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                    Open in Abilities ›
                </Link>
            )}
        </div>
    )
}
