"use client"

import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

const MAX_RESULTS = 8

export default function AbilityPicker({ keys, value, onChange }: { keys: string[]; value: string | null; onChange: (value: string | null) => void }) {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(0)
    const listId = useId()

    const results = useMemo(() => {
        const needle = query.trim().toLowerCase()
        if (!needle) return []
        return keys.filter(k => k.toLowerCase().includes(needle)).slice(0, MAX_RESULTS)
    }, [keys, query])

    function choose(key: string) {
        onChange(key)
        setQuery('')
        setOpen(false)
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => Math.min(results.length - 1, i + 1)) }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => Math.max(0, i - 1)) }
        else if (event.key === 'Enter' && results[active]) { event.preventDefault(); choose(results[active]) }
        else if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false) }
    }

    return (
        <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {value
                    ? <span className="text-sm text-foreground">{value}</span>
                    : <span className="text-sm text-muted-foreground">No ability</span>}
                {value && (
                    <button type="button" onClick={() => onChange(null)} className="text-sm text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground">
                        Remove
                    </button>
                )}
            </div>
            <div role="combobox" aria-expanded={open && results.length > 0} aria-controls={listId} aria-haspopup="listbox" className="mt-1 max-w-sm">
                <input
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0) }}
                    onKeyDown={onKeyDown}
                    placeholder={value ? 'Change to another ability' : 'Search abilities'}
                    aria-label="Granted ability"
                    aria-autocomplete="list"
                    className="w-full border-b border-border bg-transparent py-1 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                {open && results.length > 0 && (
                    <ul id={listId} role="listbox" className="mt-1">
                        {results.map((key, i) => (
                            <li
                                key={key}
                                role="option"
                                aria-selected={i === active}
                                onMouseDown={e => { e.preventDefault(); choose(key) }}
                                onMouseEnter={() => setActive(i)}
                                className={cn('cursor-pointer rounded-sm px-2 py-1 text-sm', i === active ? 'bg-muted text-foreground' : 'text-muted-foreground')}
                            >
                                {key}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
