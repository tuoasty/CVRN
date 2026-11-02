'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/app/components/ui/input'
import { OVERALL_POSITIONS } from '@/server/domains/overall/types'
import type { CategoryRatings, OverallPosition } from '@/server/domains/overall'
import type { CardOverrides } from '@/server/domains/playerCard'
import { CARD_STAT_FIELDS, CARD_STAT_LABELS } from '@/server/domains/playerCard/types/schemas'
import { cn } from '@/lib/utils'

const LABEL = 'text-xs font-semibold uppercase tracking-wider text-muted-foreground'
const LINK = 'text-xs text-primary hover:underline underline-offset-4 rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-40 disabled:no-underline'
const FIELD = 'h-8 rounded-sm font-mono text-sm tabular-nums'

export function RatingInput({ label, value, placeholder, onChange }: {
    label: string
    value: number | undefined
    placeholder?: number
    onChange: (value: number | undefined) => void
}) {
    const [text, setText] = useState(value === undefined ? '' : String(value))
    useEffect(() => {
        setText(prev => (value === undefined ? (prev.trim() === '' ? prev : '') : Number(prev) === value ? prev : String(value)))
    }, [value])

    const n = Number(text)
    const invalid = text.trim() !== '' && !(Number.isInteger(n) && n >= 1 && n <= 99)

    return (
        <label className="flex flex-col gap-1">
            <span className={LABEL}>{label}</span>
            <Input
                inputMode="numeric"
                value={text}
                placeholder={placeholder === undefined ? undefined : String(placeholder)}
                aria-invalid={invalid || undefined}
                onChange={e => {
                    const next = e.target.value
                    setText(next)
                    const parsed = Number(next)
                    onChange(next.trim() !== '' && Number.isInteger(parsed) && parsed >= 1 && parsed <= 99 ? parsed : undefined)
                }}
                className={cn(FIELD, 'w-16', invalid && 'border-destructive text-destructive')}
            />
        </label>
    )
}

export function hasOverrides(overrides: CardOverrides): boolean {
    return overrides.username !== undefined
        || overrides.ovr !== undefined
        || overrides.position !== undefined
        || Object.values(overrides.attributes ?? {}).some(v => v !== undefined)
}

export default function CardOverridesForm({
    overrides,
    onChange,
    computed,
}: {
    overrides: CardOverrides
    onChange: (overrides: CardOverrides) => void
    computed: { username: string; ovr: number; position: OverallPosition | null; attributes: CategoryRatings }
}) {
    const setAttribute = (key: keyof CategoryRatings, value: number | undefined) =>
        onChange({ ...overrides, attributes: { ...overrides.attributes, [key]: value } })

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
                <span className={LABEL}>One-time overrides</span>
                <button type="button" className={LINK} disabled={!hasOverrides(overrides)} onClick={() => onChange({})}>
                    Clear
                </button>
            </div>

            <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                <label className="flex flex-col gap-1">
                    <span className={LABEL}>Name</span>
                    <Input
                        value={overrides.username ?? ''}
                        placeholder={computed.username}
                        maxLength={40}
                        onChange={e => onChange({ ...overrides, username: e.target.value.trim() === '' ? undefined : e.target.value })}
                        className="h-8 w-48 rounded-sm text-sm"
                    />
                </label>
                <RatingInput
                    label="OVR"
                    value={overrides.ovr}
                    placeholder={computed.ovr}
                    onChange={ovr => onChange({ ...overrides, ovr })}
                />
                <div className="flex flex-col gap-1">
                    <span className={LABEL}>Position</span>
                    <div className="flex h-8 items-end gap-3" role="radiogroup" aria-label="Position override">
                        {OVERALL_POSITIONS.map(p => {
                            const effective = overrides.position ?? computed.position
                            const selected = effective === p
                            return (
                                <button
                                    key={p}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    onClick={() => onChange({ ...overrides, position: p === computed.position ? undefined : p })}
                                    className={cn(
                                        'pb-1 text-sm font-semibold rounded-sm focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                        selected ? 'text-foreground shadow-[inset_0_-2px_0_currentColor]' : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {p}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
                {CARD_STAT_FIELDS.map(key => (
                    <RatingInput
                        key={key}
                        label={CARD_STAT_LABELS[key]}
                        value={overrides.attributes?.[key]}
                        placeholder={computed.attributes[key]}
                        onChange={value => setAttribute(key, value)}
                    />
                ))}
            </div>
            <p className="text-xs text-muted-foreground">
                Blank uses the computed value. Used for the next Generate only, then cleared. An overridden OVR also picks the tier.
            </p>
        </div>
    )
}
