"use client"

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { InspectorData, PublicAbility, PublicAbilityLine } from '@/server/domains/gameData'
import ExpandingText from '../ExpandingText'
import InspectorTrigger from '../inspector/InspectorTrigger'
import { hasMoreContent } from './hasMoreContent'

interface Props {
    ability: PublicAbility
    open: boolean
    onSelect: (expandable: boolean) => void
    inspectors: Record<string, InspectorData>
}

function Marker({ ability }: { ability: PublicAbility }) {
    if (ability.marker?.kind === 'toggle') return <>Toggle</>
    if (ability.marker?.kind === 'active') {
        return (
            <>
                Active
                {ability.marker.cooldown !== undefined && (
                    <span className="ml-1.5 font-mono font-medium tabular-nums text-foreground">{ability.marker.cooldown}s</span>
                )}
            </>
        )
    }
    return null
}

function Line({ line, inspectors }: { line: PublicAbilityLine; inspectors: Record<string, InspectorData> }) {
    const inspector = line.grants ? inspectors[line.grants] : undefined
    if (!line.grants || !inspector) return <>{line.text}</>

    const at = line.text.toLowerCase().indexOf(line.grants.toLowerCase())
    if (at < 0) return <InspectorTrigger data={inspector}>{line.text}</InspectorTrigger>
    const end = at + line.grants.length
    return (
        <>
            {line.text.slice(0, at)}
            <InspectorTrigger data={inspector}>{line.text.slice(at, end)}</InspectorTrigger>
            {line.text.slice(end)}
        </>
    )
}

export default function AbilityRow({ ability, open, onSelect, inspectors }: Props) {
    const [truncated, setTruncated] = useState(false)
    const expandable = truncated || hasMoreContent(ability)
    const panelId = `ability-${ability.slug}-text`

    return (
        <div
            id={`ability-${ability.slug}`}
            onClick={() => onSelect(expandable)}
            className={cn(
                'group -mx-3 grid scroll-mt-24 grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-x-4 px-3 py-2 transition-colors duration-150 motion-reduce:transition-none',
                'md:grid-cols-[180px_minmax(0,1fr)_120px_64px] md:gap-x-6',
                expandable && 'cursor-pointer',
                open ? 'bg-muted/30' : 'hover:bg-muted/30',
            )}
        >
            <button
                type="button"
                aria-expanded={expandable ? open : undefined}
                aria-controls={expandable ? panelId : undefined}
                className="order-1 text-left text-sm font-semibold leading-5 text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:order-none"
            >
                {ability.key}
            </button>
            <ExpandingText
                open={open}
                summary={ability.summary}
                clampClassName="text-sm leading-5 text-muted-foreground max-md:line-clamp-2 md:truncate"
                onTruncatedChange={setTruncated}
                className="order-3 col-span-3 mt-0.5 md:order-none md:col-span-1 md:mt-0"
            >
                <div id={panelId} className="max-w-[68ch] text-sm leading-5 text-foreground">
                    {ability.source === 'original' && ability.text ? (
                        <p>{ability.text}</p>
                    ) : (
                        <ul className="space-y-1">
                            {ability.lines.map((line, i) => (
                                <li key={i}>
                                    <Line line={line} inspectors={inspectors} />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </ExpandingText>
            <span className="order-2 whitespace-nowrap text-right text-xs leading-5 text-muted-foreground md:order-none">
                <Marker ability={ability} />
            </span>
            <span
                aria-hidden
                className={cn(
                    'order-2 whitespace-nowrap text-right text-xs font-medium leading-5 text-muted-foreground transition-colors duration-150 group-hover:text-foreground motion-reduce:transition-none md:order-none',
                    !expandable && 'max-md:hidden md:invisible',
                )}
            >
                {open ? 'See less' : 'See more'}
            </span>
        </div>
    )
}
