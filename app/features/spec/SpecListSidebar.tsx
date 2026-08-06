'use client';

import {cn} from '@/lib/utils';
import {SPEC_POSITIONS, SpecWithRequirements, formatHeight} from '@/server/domains/spec/types';

interface Props {
    specs: SpecWithRequirements[];
    query: string;
    activeId: string | null;
    onPick: (spec: SpecWithRequirements) => void;
}

export default function SpecListSidebar({specs, query, activeId, onPick}: Props) {
    const q = query.trim().toLowerCase();
    const match = (s: SpecWithRequirements) => !q || s.name.toLowerCase().includes(q);
    const anyMatch = specs.some(match);

    return (
        <div className="overflow-y-auto">
            {SPEC_POSITIONS.map(p => {
                const group = specs.filter(s => s.position === p.code && match(s));
                if (group.length === 0) return null;
                return (
                    <div key={p.code}>
                        <div
                            className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/30 border-b border-border"
                            title={p.label}
                        >
                            {p.code}
                        </div>
                        {group.map(s => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => onPick(s)}
                                className={cn(
                                    'w-full flex items-center gap-2 px-3 py-1.5 border-b border-border text-left hover:bg-muted/40 transition-colors',
                                    s.id === activeId && 'bg-primary/10'
                                )}
                            >
                                <span className="font-semibold text-sm truncate flex-1">{s.name}</span>
                                <span className="font-mono tabular-nums text-xs text-muted-foreground shrink-0">
                                    {formatHeight(s.height)}
                                </span>
                                <span className="font-mono tabular-nums text-xs text-primary shrink-0">
                                    {s.stars}★
                                </span>
                            </button>
                        ))}
                    </div>
                );
            })}
            {!anyMatch && (
                <p className="p-3 text-sm text-muted-foreground">No specs match “{query}”.</p>
            )}
        </div>
    );
}
