"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ViewTabs } from '@/app/components/filters/ViewTabs'
import { cn } from '@/lib/utils'
import { useInformation } from './InformationProvider'

const BASE = '/admin/game-data'
const TAB_VALUES = ['rollables', 'exclusives', 'terms', 'unhandled', 'specs', 'builds'] as const
type TabValue = (typeof TAB_VALUES)[number]

function Count({ value, flag }: { value: number; flag?: boolean }) {
    return (
        <span className="ml-1.5 inline-flex items-center gap-1 font-mono text-xs font-normal tabular-nums text-muted-foreground">
            {value}
            {flag && <span aria-label="needs attention" className="h-1.5 w-1.5 rounded-full bg-secondary" />}
        </span>
    )
}

export default function InformationTabs() {
    const pathname = usePathname()
    const router = useRouter()
    const { index, termList, unhandled, loadouts, skipped, specByGameKey } = useInformation()

    const segment = pathname.slice(BASE.length + 1).split('/')[0]
    const current = (TAB_VALUES as readonly string[]).includes(segment) ? (segment as TabValue) : null
    const entries = [...index.values()]
    const rollables = entries.filter(e => e.availability !== 'exclusive').length
    const activeLoadouts = loadouts.filter(l => !skipped.has(l.key) || specByGameKey.has(l.key))
    const unlinkedLoadouts = activeLoadouts.some(l => !specByGameKey.has(l.key))

    const tabs = [
        { value: 'rollables' as const, label: <>Rollables<Count value={rollables} /></> },
        { value: 'exclusives' as const, label: <>Exclusives<Count value={entries.length - rollables} /></> },
        { value: 'terms' as const, label: <>Terms<Count value={termList.length} /></> },
        { value: 'unhandled' as const, label: <>To be handled<Count value={unhandled.length} flag={unhandled.length > 0} /></> },
        { value: 'specs' as const, label: loadouts.length > 0 ? <>Spec loadouts<Count value={activeLoadouts.length} flag={unlinkedLoadouts} /></> : 'Spec loadouts' },
        { value: 'builds' as const, label: 'Builds' },
    ]
    const importing = segment === 'import'

    return (
        <ViewTabs
            label="Information sections"
            tabs={tabs}
            value={current ?? ('' as TabValue)}
            onChange={value => router.push(`${BASE}/${value}`)}
            density="compact"
            wrapToolsBelow="xl"
        >
            <Link
                href={`${BASE}/import`}
                aria-current={importing ? 'page' : undefined}
                className={cn(
                    'inline-flex h-11 items-center border-b-2 px-3 text-sm transition-colors duration-150 motion-reduce:transition-none',
                    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50',
                    importing ? 'border-foreground font-semibold text-foreground' : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
                )}
            >
                Import
            </Link>
        </ViewTabs>
    )
}
