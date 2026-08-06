'use client';

import {useState} from 'react';
import {Check, ChevronsUpDown, Search} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Popover, PopoverContent, PopoverTrigger} from '@/app/components/ui/popover';
import {SPEC_STAT_KEYS, specStatLabel} from '@/server/domains/spec/types';

const STAT_GROUPS = Array.from(new Set(SPEC_STAT_KEYS.map(s => s.group)));

interface Props {
    value: string;
    onChange: (key: string) => void;
    takenKeys: Set<string>;
    disabled?: boolean;
}

export default function SpecStatCombobox({value, onChange, takenKeys, disabled}: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const q = query.trim().toLowerCase();
    const matches = (label: string, short: string, group: string) =>
        !q ||
        label.toLowerCase().includes(q) ||
        short.toLowerCase().includes(q) ||
        group.toLowerCase().includes(q);

    const anyMatch = SPEC_STAT_KEYS.some(s => matches(s.label, s.short, s.group));

    const select = (key: string) => {
        onChange(key);
        setOpen(false);
        setQuery('');
    };

    return (
        <Popover
            open={open}
            onOpenChange={o => {
                setOpen(o);
                if (!o) setQuery('');
            }}
        >
            <PopoverTrigger asChild disabled={disabled}>
                <button
                    type="button"
                    className="flex items-center justify-between gap-2 w-full min-w-0 h-9 rounded-md border border-input bg-transparent px-3 text-sm hover:border-primary/50 disabled:opacity-50"
                >
                    <span className={cn('truncate', !value && 'text-muted-foreground')}>
                        {value ? specStatLabel(value) : 'Choose a stat'}
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-0 rounded-sm overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border px-3 h-9">
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search stats…"
                        className="flex-1 min-w-0 bg-transparent text-sm outline-none"
                    />
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                    {STAT_GROUPS.map(group => {
                        const items = SPEC_STAT_KEYS.filter(
                            s => s.group === group && matches(s.label, s.short, s.group)
                        );
                        if (items.length === 0) return null;
                        return (
                            <div key={group}>
                                <div className="px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                                    {group}
                                </div>
                                {items.map(s => {
                                    const key = s.key as string;
                                    const taken = takenKeys.has(key) && key !== value;
                                    const selected = key === value;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            disabled={taken}
                                            onClick={() => select(key)}
                                            className={cn(
                                                'flex items-center justify-between gap-2 w-full px-2 py-1.5 text-sm text-left rounded-sm',
                                                taken ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/60',
                                                selected && 'bg-primary/10'
                                            )}
                                        >
                                            <span className="truncate">{s.label}</span>
                                            <span className="flex items-center gap-1.5 shrink-0">
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    {s.short}
                                                </span>
                                                {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                    {!anyMatch && (
                        <p className="px-3 py-4 text-sm text-muted-foreground text-center">No stats match.</p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
