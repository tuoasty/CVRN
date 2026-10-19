"use client"

import { cn } from '@/lib/utils'

export interface TrayItem {
    key: string
    label: string
}

export interface TrayColumn {
    key: string
    heading: string
    headingClass?: string
    items: TrayItem[]
}

interface Props {
    id: string
    label: string
    columns: TrayColumn[]
    activeKey: string | null
    mono?: boolean
    onPick: (key: string) => void
}

export function trayItemId(trayId: string, key: string): string {
    return `${trayId}-${key}`
}

export default function PickTray({ id, label, columns, activeKey, mono, onPick }: Props) {
    if (columns.every(c => c.items.length === 0)) {
        return <p id={id} className="px-2.5 text-sm text-muted-foreground">No match</p>
    }

    return (
        <div id={id} role="listbox" aria-label={label} className="grid gap-y-5 md:grid-cols-4 md:gap-x-8">
            {columns.map(column => (
                <div key={column.key} role="group" aria-label={column.heading}>
                    <p className={cn('px-2.5 pb-1.5 text-xs font-semibold uppercase tracking-[0.05em]', column.headingClass ?? 'text-muted-foreground')}>
                        {column.heading}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-1">
                        {column.items.map(item => {
                            const active = item.key === activeKey
                            return (
                                <button
                                    key={item.key}
                                    id={trayItemId(id, item.key)}
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    tabIndex={-1}
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => onPick(item.key)}
                                    className={cn(
                                        'truncate px-2.5 py-1 text-left text-sm transition-colors duration-150 motion-reduce:transition-none',
                                        mono && 'font-mono tabular-nums',
                                        active ? 'bg-muted/90 text-foreground' : 'text-muted-foreground hover:bg-muted/90 hover:text-foreground',
                                    )}
                                >
                                    {item.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
