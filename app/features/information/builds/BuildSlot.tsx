"use client"

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const LABEL = 'shrink-0 text-xs font-semibold uppercase leading-4 tracking-[0.05em] text-muted-foreground'

interface Props {
    label: string
    value: string | null
    editing: boolean
    typeable: boolean
    typed: string
    ghost: string
    trayId: string
    activeId?: string
    onOpen: () => void
    onClear: () => void
    onType: (value: string) => void
    onKeyDown: (e: React.KeyboardEvent) => void
}

const BuildSlot = forwardRef<HTMLButtonElement, Props>(function BuildSlot(
    { label, value, editing, typeable, typed, ghost, trayId, activeId, onOpen, onClear, onType, onKeyDown },
    ref,
) {
    return (
        <div
            className={cn(
                'relative w-full px-3 pb-[7px] pt-1.5 transition-colors duration-150 motion-reduce:transition-none md:w-[190px]',
                editing ? 'bg-muted/90 shadow-[inset_0_-2px_0_hsl(var(--foreground))]' : 'bg-muted/45',
            )}
        >
            {editing && typeable ? (
                <label className="flex items-baseline gap-3 md:block">
                    <span className={cn(LABEL, 'block')}>{label}</span>
                    <span className="relative block min-w-0 flex-1">
                        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre text-sm leading-5">
                            <span className="invisible font-semibold">{typed}</span>
                            <span className="text-muted-foreground">{ghost}</span>
                        </span>
                        <input
                            autoFocus
                            role="combobox"
                            aria-expanded
                            aria-controls={trayId}
                            aria-activedescendant={activeId}
                            aria-autocomplete="list"
                            value={typed}
                            onChange={e => onType(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="Type to search"
                            className="relative block w-full bg-transparent text-sm font-semibold leading-5 text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
                        />
                    </span>
                </label>
            ) : (
                <button
                    ref={ref}
                    type="button"
                    onClick={onOpen}
                    onKeyDown={editing ? onKeyDown : undefined}
                    role="combobox"
                    aria-haspopup="listbox"
                    aria-expanded={editing}
                    aria-controls={trayId}
                    aria-activedescendant={editing ? activeId : undefined}
                    className="flex w-full items-baseline gap-3 text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:block"
                >
                    <span className={cn(LABEL, 'block')}>{label}</span>
                    <span
                        className={cn(
                            'block min-w-0 flex-1 truncate text-right text-sm leading-5 md:text-left',
                            value ? 'font-semibold text-foreground' : 'text-muted-foreground',
                            value && 'pr-5',
                        )}
                    >
                        {value ?? 'Any'}
                    </span>
                </button>
            )}
            {value && !editing && (
                <button
                    type="button"
                    onClick={onClear}
                    aria-label={`Clear ${label.toLowerCase()}`}
                    className="absolute bottom-[7px] right-2 px-1 text-sm leading-5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    ×
                </button>
            )}
        </div>
    )
})

export default BuildSlot
