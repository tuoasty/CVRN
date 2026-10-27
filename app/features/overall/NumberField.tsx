"use client"

import { ReactNode, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Range = { step: number; min: number; max: number }

function decimalsOf(step: number): number {
    const text = String(step)
    return text.includes('.') ? text.split('.')[1].length : 0
}

function clampToStep(n: number, { step, min, max }: Range): number {
    const snapped = Math.round(n / step) * step
    return Number(Math.min(max, Math.max(min, snapped)).toFixed(decimalsOf(step)))
}

export function ScrubLabel({ value, onCommit, range, children, className }: {
    value: number
    onCommit: (n: number) => void
    range: Range
    children: ReactNode
    className?: string
}) {
    const start = useRef<{ x: number; value: number } | null>(null)

    return (
        <span
            className={cn('cursor-ew-resize select-none touch-none', className)}
            onPointerDown={e => {
                e.currentTarget.setPointerCapture(e.pointerId)
                start.current = { x: e.clientX, value }
            }}
            onPointerMove={e => {
                if (!start.current) return
                const ticks = Math.round((e.clientX - start.current.x) / 4)
                const next = clampToStep(start.current.value + ticks * range.step * (e.shiftKey ? 5 : 1), range)
                if (next !== value) onCommit(next)
            }}
            onPointerUp={e => {
                e.currentTarget.releasePointerCapture(e.pointerId)
                start.current = null
            }}
            onPointerCancel={() => { start.current = null }}
        >
            {children}
        </span>
    )
}

export default function NumberField({ value, onCommit, range, label, invalid, className }: {
    value: number
    onCommit: (n: number) => void
    range: Range
    label: string
    invalid?: boolean
    className?: string
}) {
    const [text, setText] = useState(String(value))

    useEffect(() => {
        setText(prev => (Number(prev) === value && prev.trim() !== '' ? prev : String(value)))
    }, [value])

    return (
        <input
            type="number"
            inputMode="decimal"
            step={range.step}
            min={range.min}
            max={range.max}
            value={text}
            aria-label={label}
            aria-invalid={invalid || undefined}
            onChange={e => {
                setText(e.target.value)
                const n = e.target.valueAsNumber
                if (Number.isFinite(n)) onCommit(n)
            }}
            onBlur={() => setText(String(value))}
            className={cn(
                'h-7 w-full rounded-sm border border-transparent bg-transparent px-1.5 text-right font-mono text-sm tabular-nums text-foreground',
                'transition-[border-color,box-shadow] duration-150 ease-out hover:border-border',
                'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40',
                '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                invalid && 'text-destructive',
                className,
            )}
        />
    )
}

export const WEIGHT_RANGE: Range = { step: 1, min: 0, max: 100 }
export const FLOOR_RANGE: Range = { step: 1, min: 1, max: 98 }
export const CEIL_RANGE: Range = { step: 1, min: 2, max: 99 }
export const CURVE_RANGE: Range = { step: 0.1, min: 0.2, max: 5 }
