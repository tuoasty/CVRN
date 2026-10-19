"use client"

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
    open: boolean
    summary: React.ReactNode
    clampClassName: string
    onTruncatedChange: (truncated: boolean) => void
    className?: string
    children: React.ReactNode
}

const DURATION = 200

export default function ExpandingText({ open, summary, clampClassName, onTruncatedChange, className, children }: Props) {
    const clampRef = useRef<HTMLParagraphElement>(null)
    const [closedHeight, setClosedHeight] = useState<number | undefined>(undefined)
    const [closing, setClosing] = useState(false)
    const [wasOpen, setWasOpen] = useState(open)

    if (wasOpen !== open) {
        setWasOpen(open)
        setClosing(!open)
    }

    const showFull = open || closing

    useEffect(() => {
        if (!closing) return
        const timer = window.setTimeout(() => setClosing(false), DURATION)
        return () => window.clearTimeout(timer)
    }, [closing])

    useLayoutEffect(() => {
        const el = clampRef.current
        if (showFull || !el) return
        const measure = () => {
            setClosedHeight(el.offsetHeight)
            onTruncatedChange(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
        }
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(el)
        return () => observer.disconnect()
    }, [showFull, onTruncatedChange])

    return (
        <div
            className={cn(
                'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                className,
            )}
        >
            <div className={cn('min-w-0', showFull && 'overflow-hidden')} style={showFull ? { minHeight: closedHeight } : undefined}>
                {showFull ? children : <p ref={clampRef} className={clampClassName}>{summary}</p>}
            </div>
        </div>
    )
}
