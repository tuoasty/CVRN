'use client';

import {useEffect, useRef} from 'react';
import {Search} from 'lucide-react';
import {SpecWithRequirements, formatHeight} from '@/server/domains/spec/types';

interface Props {
    current: SpecWithRequirements | null;
    open: boolean;
    query: string;
    onQueryChange: (q: string) => void;
    onToggle: (open: boolean) => void;
}

export default function SpecPicker({current, open, query, onQueryChange, onToggle}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    if (open) {
        return (
            <div className="w-60 h-9 flex items-center gap-2 rounded-md border border-primary ring-2 ring-primary/40 bg-background px-3">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                    ref={inputRef}
                    value={query}
                    onChange={e => onQueryChange(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Escape') onToggle(false);
                    }}
                    placeholder="Filter specs…"
                    className="flex-1 min-w-0 bg-transparent text-sm outline-none"
                />
                <button
                    type="button"
                    onClick={() => onToggle(false)}
                    className="text-xs text-muted-foreground shrink-0"
                >
                    esc
                </button>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => onToggle(true)}
            className="w-60 h-9 flex items-center gap-2 rounded-md border border-border bg-background px-3 text-left hover:border-primary/50 transition-colors"
        >
            {current ? (
                <>
                    <span className="font-semibold text-sm truncate">{current.name}</span>
                    <span className="font-mono tabular-nums text-xs text-primary shrink-0">
                        {current.stars}★
                    </span>
                    <span className="rounded-full border border-border px-1.5 text-xs font-semibold shrink-0">
                        {current.position}
                    </span>
                    <span className="ml-auto font-mono tabular-nums text-xs text-muted-foreground shrink-0">
                        {formatHeight(current.height)}
                    </span>
                </>
            ) : (
                <span className="text-sm text-muted-foreground">Pick a spec…</span>
            )}
        </button>
    );
}
