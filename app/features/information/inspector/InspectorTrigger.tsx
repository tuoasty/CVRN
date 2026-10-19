"use client"

import { HoverCard } from 'radix-ui'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/app/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { InspectorData, TunedInspector } from '@/server/domains/gameData'
import InspectorContent from './InspectorContent'
import { useHoverCapable } from './useHoverCapable'

interface Props {
    data: InspectorData | TunedInspector
    title?: string
    children: React.ReactNode
    className?: string
}

const TRIGGER = 'cursor-help underline decoration-muted-foreground decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'

function stopRowClick(e: React.MouseEvent) {
    e.stopPropagation()
}

export default function InspectorTrigger({ data, title, children, className }: Props) {
    const hover = useHoverCapable()

    if (!hover) {
        return (
            <span onClick={stopRowClick}>
                <Sheet>
                    <SheetTrigger asChild>
                        <button type="button" className={cn(TRIGGER, className)}>{children}</button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-none p-5 pb-8">
                        <SheetTitle className="sr-only">{title ?? data.name}</SheetTitle>
                        <InspectorContent data={data} title={title} />
                    </SheetContent>
                </Sheet>
            </span>
        )
    }

    return (
        <span onClick={stopRowClick}>
            <HoverCard.Root openDelay={200} closeDelay={100}>
                <HoverCard.Trigger asChild>
                    <button type="button" className={cn(TRIGGER, className)}>{children}</button>
                </HoverCard.Trigger>
                <HoverCard.Portal>
                    <HoverCard.Content
                        side="bottom"
                        align="start"
                        sideOffset={6}
                        collisionPadding={16}
                        className={cn(
                            'z-50 w-[340px] rounded-none border border-border bg-card p-4 text-foreground shadow-lg outline-none',
                            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-1',
                            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-1',
                            'duration-150 motion-reduce:animate-none',
                        )}
                    >
                        <InspectorContent data={data} title={title} />
                    </HoverCard.Content>
                </HoverCard.Portal>
            </HoverCard.Root>
        </span>
    )
}
