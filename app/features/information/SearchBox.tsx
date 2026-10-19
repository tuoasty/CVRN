"use client"

import { cn } from '@/lib/utils'

interface Props {
    value: string
    onChange: (value: string) => void
    placeholder: string
    className?: string
}

export default function SearchBox({ value, onChange, placeholder, className }: Props) {
    return (
        <input
            type="search"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => {
                if (e.key === 'Escape') onChange('')
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            className={cn(
                'h-9 w-[260px] rounded-md bg-muted/45 px-3 text-sm text-foreground placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-search-cancel-button]:hidden',
                className,
            )}
        />
    )
}
